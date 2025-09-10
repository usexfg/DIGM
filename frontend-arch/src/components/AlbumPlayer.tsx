import React, { useState, useEffect, useCallback } from 'react';
import { AlbumLicenseChecker, LicenseOwnership } from '../utils/licenseCheck';
import { AlbumPurchaseManager, AlbumPurchaseRequest } from '../utils/albumPurchase';
import { useWallet } from '../hooks/useWallet';
import { useFuegoRPC } from '../hooks/useFuegoRPC';

interface Track {
  id: string;
  title: string;
  duration: number;
  isPreview: boolean;
  audioUrl: string;
}

interface Album {
  albumId: string;
  title: string;
  artist: string;
  tracks: Track[];
  priceXFG: number;
  payment: {
    paymentCode: string; // BIP47-style payment code
    artistSigningService?: string;
  };
  coverArt?: string;
}

interface AlbumPlayerProps {
  album: Album;
  currentTrack?: Track;
  onTrackChange?: (track: Track) => void;
  onPurchaseComplete?: (txHash: string) => void;
}

interface AccessInfo {
  hasLicense: boolean;
  isPremium: boolean;
  hasAccess: boolean;
  accessType: 'license' | 'premium' | 'none';
  licenseDetails?: LicenseOwnership;
}

const AlbumPlayer: React.FC<AlbumPlayerProps> = ({ 
  album, 
  currentTrack, 
  onTrackChange,
  onPurchaseComplete 
}) => {
  const { wallet, userPublicKey } = useWallet();
  const { fuegoRPC } = useFuegoRPC();
  
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const licenseChecker = new AlbumLicenseChecker(fuegoRPC);
  const purchaseManager = new AlbumPurchaseManager(fuegoRPC);

  // Check user access on mount and when user/album changes
  useEffect(() => {
    if (!userPublicKey) {
      setAccessInfo(null);
      setLoading(false);
      return;
    }

    checkUserAccess();
  }, [userPublicKey, album.albumId]);

  const checkUserAccess = useCallback(async () => {
    if (!userPublicKey) return;

    setLoading(true);
    try {
      const accessData = await licenseChecker.getUserAccessInfo(userPublicKey, album.albumId);
      setAccessInfo(accessData);
    } catch (error) {
      console.error('Error checking user access:', error);
      setAccessInfo({
        hasLicense: false,
        isPremium: false,
        hasAccess: false,
        accessType: 'none'
      });
    } finally {
      setLoading(false);
    }
  }, [userPublicKey, album.albumId, licenseChecker]);

  const canPlayTrack = useCallback((track: Track): boolean => {
    // Always allow preview tracks
    if (track.isPreview) return true;
    
    // Require access for non-preview tracks
    return accessInfo?.hasAccess || false;
  }, [accessInfo]);

  const handlePlayTrack = useCallback((track: Track) => {
    if (!canPlayTrack(track)) {
      setShowPurchaseModal(true);
      return;
    }
    
    // Play the track
    if (onTrackChange) {
      onTrackChange(track);
    }
  }, [canPlayTrack, onTrackChange]);

  const handlePurchase = useCallback(async () => {
    if (!wallet || !userPublicKey) {
      setPurchaseError('Wallet not connected');
      return;
    }

    setPurchasing(true);
    setPurchaseError(null);

    try {
      // Validate purchase first
      const purchaseRequest: AlbumPurchaseRequest = {
        albumId: album.albumId,
        artistPaymentCode: album.payment.paymentCode,
        priceXFG: album.priceXFG,
        buyerWallet: wallet,
        artistSigningService: album.payment.artistSigningService
      };

      const validation = await purchaseManager.validatePurchaseRequest(purchaseRequest);
      
      if (!validation.valid) {
        setPurchaseError(validation.error || 'Purchase validation failed');
        return;
      }

      // Proceed with purchase
      const result = await purchaseManager.purchaseAlbum(purchaseRequest);
      
      if (result.success && result.txHash) {
        // Refresh access info
        await checkUserAccess();
        
        // Close modal
        setShowPurchaseModal(false);
        
        // Notify parent
        if (onPurchaseComplete) {
          onPurchaseComplete(result.txHash);
        }
      } else {
        setPurchaseError(result.error || 'Purchase failed');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setPurchasing(false);
    }
  }, [wallet, userPublicKey, album, purchaseManager, checkUserAccess, onPurchaseComplete]);

  const handleClosePurchaseModal = useCallback(() => {
    setShowPurchaseModal(false);
    setPurchaseError(null);
  }, []);

  const formatPrice = useCallback((priceXFG: number): string => {
    return `${priceXFG.toFixed(6)} XFG`;
  }, []);

  if (loading) {
    return (
      <div className="album-player loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Checking access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="album-player">
      <div className="album-header">
        {album.coverArt && (
          <img 
            src={album.coverArt} 
            alt={`${album.title} cover`}
            className="album-cover"
          />
        )}
        <div className="album-info">
          <h2 className="album-title">{album.title}</h2>
          <p className="album-artist">{album.artist}</p>
          {accessInfo && (
            <div className="access-status">
              {accessInfo.hasLicense && (
                <span className="status-badge license">
                  ✓ Owned
                </span>
              )}
              {accessInfo.isPremium && !accessInfo.hasLicense && (
                <span className="status-badge premium">
                  ⭐ Premium Access
                </span>
              )}
              {!accessInfo.hasAccess && (
                <span className="status-badge no-access">
                  🔒 Purchase Required
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="track-list">
        {album.tracks.map((track, index) => (
          <div 
            key={track.id}
            className={`track-item ${currentTrack?.id === track.id ? 'active' : ''}`}
          >
            <div className="track-info">
              <span className="track-number">{index + 1}</span>
              <span className="track-title">{track.title}</span>
              <span className="track-duration">
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
              </span>
              {track.isPreview && (
                <span className="preview-badge">Preview</span>
              )}
            </div>
            
            <div className="track-controls">
              {canPlayTrack(track) ? (
                <button 
                  className="play-button"
                  onClick={() => handlePlayTrack(track)}
                >
                  ▶
                </button>
              ) : (
                <button 
                  className="locked-button"
                  onClick={() => setShowPurchaseModal(true)}
                >
                  🔒
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!accessInfo?.hasAccess && (
        <div className="purchase-prompt">
          <h3>Get Full Access</h3>
          <p>Purchase this album to unlock all tracks</p>
          <div className="price-display">
            <span className="price">{formatPrice(album.priceXFG)}</span>
            <span className="currency">+ network fee</span>
          </div>
          <button 
            className="purchase-button"
            onClick={() => setShowPurchaseModal(true)}
          >
            Purchase Album
          </button>
        </div>
      )}

      {showPurchaseModal && (
        <PurchaseModal
          album={album}
          onPurchase={handlePurchase}
          onClose={handleClosePurchaseModal}
          purchasing={purchasing}
          error={purchaseError}
        />
      )}
    </div>
  );
};

interface PurchaseModalProps {
  album: Album;
  onPurchase: () => void;
  onClose: () => void;
  purchasing: boolean;
  error: string | null;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  album,
  onPurchase,
  onClose,
  purchasing,
  error
}) => {
  const formatPrice = (priceXFG: number): string => {
    return `${priceXFG.toFixed(6)} XFG`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="purchase-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Purchase Album</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="album-summary">
            <h4>{album.title}</h4>
            <p>by {album.artist}</p>
            <p>{album.tracks.length} tracks</p>
          </div>
          
          <div className="purchase-details">
            <div className="price-breakdown">
              <div className="price-row">
                <span>Album Price:</span>
                <span>{formatPrice(album.priceXFG)}</span>
              </div>
              <div className="price-row">
                <span>Network Fee:</span>
                <span>0.008000 XFG</span>
              </div>
              <div className="price-row total">
                <span>Total:</span>
                <span>{formatPrice(album.priceXFG + 0.008)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
          
          <div className="modal-actions">
            <button 
              className="cancel-button" 
              onClick={onClose}
              disabled={purchasing}
            >
              Cancel
            </button>
            <button 
              className="confirm-purchase-button" 
              onClick={onPurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <>
                  <div className="mini-spinner"></div>
                  Processing...
                </>
              ) : (
                'Confirm Purchase'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumPlayer;
