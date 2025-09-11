import Gun from 'gun';
import { fuegoDiscovery, FuegoPeer } from './fuegoDiscovery';

// Enhanced GUN configuration with Fuego XFG network integration

export interface GunConfig {
  peers: string[];
  localStorage: boolean;
  radisk: boolean;
  fuego?: {
    enabled: boolean;
    autoDiscovery: boolean;
    discoveryInterval: number;
  };
}

// Default configuration for Phase 3
const defaultConfig: GunConfig = {
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun'
  ],
  localStorage: true,
  radisk: true,
  fuego: {
    enabled: true,
    autoDiscovery: true,
    discoveryInterval: 30000
  }
};

// Create GUN instance with Fuego XFG network integration
export const createGunInstance = async (config: GunConfig = defaultConfig) => {
  let peers = [...config.peers];

  // Integrate with Fuego XFG network if enabled
  if (config.fuego?.enabled) {
    try {
      console.log('Initializing Fuego XFG network integration...');
      
      // Start peer discovery
      await fuegoDiscovery.startDiscovery(config.fuego.discoveryInterval);
      
      // Get discovered peers
      const fuegoPeers = fuegoDiscovery.getPeerUrls();
      peers = [...fuegoPeers, ...peers];
      
      console.log(`Fuego XFG integration: ${fuegoPeers.length} peers discovered`);
    } catch (error) {
      console.warn('Fuego XFG integration failed, using fallback peers:', error);
      // Use fallback peers if Fuego discovery fails
      peers = [...fuegoDiscovery.getFallbackPeerUrls(), ...peers];
    }
  }

  const gunConfig = {
    peers,
    localStorage: config.localStorage,
    radisk: config.radisk
  };

  console.log(`GUN instance created with ${peers.length} peers`);
  return Gun(gunConfig);
};

// Default GUN instance for the application
let gunInstance: any = null;

// Initialize GUN instance
export const initializeGun = async () => {
  if (!gunInstance) {
    gunInstance = await createGunInstance();
  }
  return gunInstance;
};

// Get GUN instance (initialize if needed)
export const getGunInstance = async () => {
  if (!gunInstance) {
    gunInstance = await initializeGun();
  }
  return gunInstance;
};

// GUN database references for different data types
export const getGunRefs = async () => {
  const gun = await getGunInstance();
  return {
    playlists: gun.get('playlists'),
    curation: gun.get('curation'),
    users: gun.get('users'),
    tracks: gun.get('tracks')
  };
};

// Helper function to save data to GUN
export const saveToGun = async (ref: any, data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    ref.put(data, (ack: any) => {
      if (ack.err) {
        reject(ack.err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to get data from GUN
export const getFromGun = async (ref: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    ref.once((data: any, ack: any) => {
      if (ack.err) {
        reject(ack.err);
      } else {
        resolve(data);
      }
    });
  });
};

// Helper function to listen for real-time updates
export const listenToGun = (ref: any, callback: (data: any) => void) => {
  ref.on((data: any) => {
    if (data) {
      callback(data);
    }
  });
};

export default getGunInstance;

