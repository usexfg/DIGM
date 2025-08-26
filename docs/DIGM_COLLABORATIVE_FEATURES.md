# DIGM Collaborative Features: Paradio Curation Stations

## Overview
This document focuses on **Paradio curation stations** as the primary collaborative feature for DIGM, allowing artists to create radio stations and listeners to submit station concepts for public curation, with a potential curator role system for managing live radio content.

## Core Concept: Paradio Curation Stations (Playlist Extensions)

### 🎵 **Artist-Created Playlists → Radio Stations**
- Artists create playlists that can be **extended into radio stations**
- Playlists become live radio stations during **curation hours** (e.g., 2-4 hours per day)
- During curation hours: Live DJ sessions, listener interaction, track requests
- Outside curation hours: Regular Paradio programming continues
- **Revenue sharing**: 20% of listener PARA earnings go to playlist creator/curator during curation mode

### 👥 **Listener-Submitted Playlists → Station Concepts**
- Listeners submit playlist concepts that can become radio stations
- No public profiles needed - focus on playlist quality and radio potential
- Community voting system for playlist-to-station conversion
- Top playlist concepts get scheduled curation hours on Paradio

### 🏆 **Curator Role System for Scheduled Curation**
- Users post PARA as collateral to gain curator permissions
- Curators manage the **transition from playlist to live radio**
- Curators earn rewards for successful playlist-to-station conversions
- **Scheduled curation**: Curators manage specific time slots for their approved playlists

---

## Technical Implementation

### 1. **Paradio Station Data Structure**
```typescript
interface ParadioStation {
  id: string
  name: string
  description: string
  createdBy: string
  creatorType: 'artist' | 'listener' | 'curator'
  status: 'playlist' | 'approved' | 'scheduled' | 'live' | 'offline'
  
  // Playlist properties (base)
  tracks: PlaylistTrack[]
  genre: string
  mood: string
  tags: string[]
  
  // Radio extension properties
  currentTrack: string
  queue: StationTrack[]
  listeners: number
  maxListeners: number
  isLive: boolean
  
  // Scheduled curation properties
  curationSchedule: {
    enabled: boolean
    timeSlots: CurationTimeSlot[]
    totalHoursPerDay: number
    daysActive: string[] // ['monday', 'tuesday', etc.]
  }
  
  // Curation properties
  isCurated: boolean
  curatorApproved?: boolean
  curatorId?: string
  curatorNotes?: string
  
  // Live broadcast properties (only during curation hours)
  djSession: {
    currentDJ: string
    djQueue: string[]
    sessionStart: number
    sessionEnd?: number
  }
  
  // Community interaction (only during curation hours)
  chat: ChatMessage[]
  listenerRequests: TrackRequest[]
  
  // Revenue tracking
  stats: {
    totalPlays: number
    totalListeners: number
    totalHours: number
    curationHours: number
    donations: number
    followers: number
  }
  
  revenue: {
    total: number
    creatorShare: number
    curatorShare: number
    djShare: number
    platformShare: number
    curationModeRevenue: number // Revenue during curation hours
  }
  
  createdAt: number
  lastLive: number
}

interface CurationTimeSlot {
  id: string
  dayOfWeek: string
  startTime: string // "14:00" (2 PM)
  endTime: string // "16:00" (4 PM)
  timezone: string
  isActive: boolean
}

interface StationTrack {
  id: string
  trackId: string
  position: number
  addedAt: number
  addedBy: string
  requestedBy?: string
  note?: string
  playCount: number
}

interface ChatMessage {
  id: string
  userId: string
  message: string
  timestamp: number
  type: 'chat' | 'request' | 'donation'
}

interface TrackRequest {
  id: string
  trackId: string
  requestedBy: string
  timestamp: number
  status: 'pending' | 'approved' | 'rejected'
}
```

### 2. **Radio Curator Role System**
```typescript
interface RadioCuratorRole {
  id: string
  userId: string
  collateral: number // PARA tokens posted as collateral
  status: 'active' | 'suspended' | 'inactive'
  permissions: {
    canApproveStations: boolean
    canRejectStations: boolean
    canHostStations: boolean
    canManageDJs: boolean
    canFeatureStations: boolean
    canRemoveStations: boolean
  }
  stats: {
    stationsApproved: number
    stationsRejected: number
    stationsHosted: number
    totalBroadcastHours: number
    accuracy: number // Based on community feedback
    totalRewards: number
  }
  createdAt: number
  lastActive: number
}

interface StationApplication {
  id: string
  userId: string
  stationConcept: ParadioStation
  motivation: string
  experience: string
  proposedSchedule: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: number
  notes?: string
}
```

### 3. **Radio Curation Workflow**
```typescript
interface RadioCurationWorkflow {
  // Listener submits station concept
  submitStationConcept(station: ParadioStation): Promise<string>
  
  // Curator reviews station concept
  reviewStationConcept(stationId: string, curatorId: string, decision: 'approve' | 'reject', notes?: string): Promise<void>
  
  // Curator hosts approved station
  hostStation(stationId: string, curatorId: string): Promise<void>
  
  // Community votes on curator decisions
  voteOnCuratorDecision(stationId: string, userId: string, vote: 'agree' | 'disagree'): Promise<void>
  
  // Calculate curator accuracy
  calculateCuratorAccuracy(curatorId: string): Promise<number>
  
  // Distribute radio rewards
  distributeRadioRewards(curatorId: string, amount: number): Promise<void>
}
```

---

## User Experience Flow

### **For Artists:**
1. **Create Station**: Design radio station concept with theme, genre, and schedule
2. **Submit for Curation**: Submit station concept for curator approval
3. **Host Live**: Once approved, host live radio sessions
4. **Engage Listeners**: Interact with listeners through chat and track requests
5. **Earn**: Revenue from listens, donations, and exclusive content

### **For Listeners:**
1. **Discover**: Browse curated radio stations and live broadcasts
2. **Submit Concepts**: Create and submit station concepts for curation
3. **Listen Live**: Tune into live radio stations and interact with DJs
4. **Vote**: Vote on station quality and curator decisions
5. **Request**: Request tracks and interact with the community

### **For Radio Curators:**
1. **Apply**: Post PARA collateral and apply for radio curator role
2. **Review**: Approve/reject station concepts based on quality and feasibility
3. **Host**: Host approved stations and manage live broadcasts
4. **Manage**: Coordinate DJ sessions and station programming
5. **Earn**: Rewards based on curation quality and broadcast success

---

## Implementation Components

### 1. **Artist Radio Station Creator**
```typescript
// frontend/src/components/ArtistRadioCreator.tsx
const ArtistRadioCreator: React.FC = () => {
  const [station, setStation] = useState<ParadioStation | null>(null)
  const [availableTracks, setAvailableTracks] = useState<Track[]>([])
  
  const createStationConcept = async (name: string, description: string, genre: string) => {
    const newStation: ParadioStation = {
      id: crypto.randomUUID(),
      name,
      description,
      createdBy: user.address,
      creatorType: 'artist',
      status: 'concept',
      currentTrack: '',
      queue: [],
      listeners: 0,
      maxListeners: 100,
      isLive: false,
      genre,
      mood: '',
      tags: [],
      isCurated: false,
      djSession: {
        currentDJ: '',
        djQueue: [],
        sessionStart: 0
      },
      chat: [],
      listenerRequests: [],
      stats: { totalPlays: 0, totalListeners: 0, totalHours: 0, donations: 0, followers: 0 },
      revenue: { total: 0, creatorShare: 0, curatorShare: 0, djShare: 0, platformShare: 0 },
      createdAt: Date.now(),
      lastLive: 0
    }
    
    await gunStorage.storeStationConcept(newStation)
    setStation(newStation)
  }
  
  const addTrackToQueue = async (trackId: string, position: number) => {
    if (!station) return
    
    const track: StationTrack = {
      id: crypto.randomUUID(),
      trackId,
      position,
      addedAt: Date.now(),
      addedBy: user.address,
      playCount: 0
    }
    
    const updatedStation = {
      ...station,
      queue: [...station.queue, track].sort((a, b) => a.position - b.position)
    }
    
    await gunStorage.updateStation(updatedStation)
    setStation(updatedStation)
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-200">Create Radio Station</h2>
      
      {!station ? (
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Station name"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded"
          />
          <textarea 
            placeholder="Station description and concept"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded"
          />
          <select className="w-full p-3 bg-slate-800 border border-slate-600 rounded">
            <option value="">Select Genre</option>
            <option value="electronic">Electronic</option>
            <option value="hip-hop">Hip-Hop</option>
            <option value="rock">Rock</option>
            <option value="jazz">Jazz</option>
            <option value="ambient">Ambient</option>
            <option value="mixed">Mixed</option>
          </select>
          <button onClick={() => createStationConcept('My Radio', 'Description', 'electronic')} className="btn-primary">
            Create Station Concept
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-200">{station.name}</h3>
          
          {/* Station Queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-slate-300 font-medium mb-2">Available Tracks</h4>
              {availableTracks.map(track => (
                <div key={track.id} className="p-2 bg-slate-700/50 rounded mb-2">
                  <p className="text-slate-300">{track.title}</p>
                  <p className="text-slate-500 text-sm">{track.artist}</p>
                  <button 
                    onClick={() => addTrackToQueue(track.id, station.queue.length)}
                    className="btn-secondary text-sm mt-1"
                  >
                    Add to Queue
                  </button>
                </div>
              ))}
            </div>
            
            <div>
              <h4 className="text-slate-300 font-medium mb-2">Station Queue</h4>
              {station.queue.map((track, index) => (
                <div key={track.id} className="p-2 bg-slate-700/50 rounded mb-2">
                  <p className="text-slate-300">{index + 1}. Track {track.trackId}</p>
                  <p className="text-slate-500 text-sm">Added by {track.addedBy}</p>
                </div>
              ))}
            </div>
          </div>
          
          <button className="btn-primary">Submit for Curation</button>
        </div>
      )}
    </div>
  )
}
```

### 2. **Listener Station Submission**
```typescript
// frontend/src/components/ListenerStationSubmission.tsx
const ListenerStationSubmission: React.FC = () => {
  const [submittedStations, setSubmittedStations] = useState<ParadioStation[]>([])
  
  const submitStationConcept = async (station: ParadioStation) => {
    const submission: ParadioStation = {
      ...station,
      creatorType: 'listener',
      status: 'concept',
      isCurated: false,
      createdAt: Date.now()
    }
    
    await gunStorage.submitStationForCuration(submission)
    setSubmittedStations(prev => [...prev, submission])
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-200">Submit Radio Station Concept</h2>
      
      <div className="p-4 bg-slate-800/30 border border-slate-600 rounded-lg">
        <h3 className="text-slate-300 font-medium mb-2">Submission Guidelines</h3>
        <ul className="text-slate-400 text-sm space-y-1">
          <li>• Station must have a clear theme and concept</li>
          <li>• Include proposed schedule and programming</li>
          <li>• All tracks must be from DIGM platform</li>
          <li>• Consider listener engagement and interaction</li>
          <li>• High-quality concepts may be featured and hosted</li>
        </ul>
      </div>
      
      {/* Station creation form similar to artist version */}
      <ArtistRadioCreator onSubmit={submitStationConcept} />
      
      {/* Submitted stations status */}
      <div>
        <h3 className="text-slate-300 font-medium mb-2">Your Submissions</h3>
        {submittedStations.map(station => (
          <div key={station.id} className="p-3 bg-slate-700/50 rounded mb-2">
            <p className="text-slate-300">{station.name}</p>
            <p className="text-slate-500 text-sm">
              Status: {station.isCurated ? 'Approved' : 'Pending Review'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3. **Radio Curator Dashboard**
```typescript
// frontend/src/components/RadioCuratorDashboard.tsx
const RadioCuratorDashboard: React.FC = () => {
  const [pendingStations, setPendingStations] = useState<ParadioStation[]>([])
  const [curatorStats, setCuratorStats] = useState<RadioCuratorRole | null>(null)
  const [hostedStations, setHostedStations] = useState<ParadioStation[]>([])
  
  const reviewStation = async (stationId: string, decision: 'approve' | 'reject', notes?: string) => {
    await gunStorage.reviewStationConcept(stationId, user.address, decision, notes)
    
    // Update local state
    setPendingStations(prev => prev.filter(s => s.id !== stationId))
  }
  
  const hostStation = async (stationId: string) => {
    await gunStorage.hostStation(stationId, user.address)
    
    // Update station status to live
    const station = pendingStations.find(s => s.id === stationId)
    if (station) {
      const updatedStation = { ...station, status: 'live', isLive: true }
      setHostedStations(prev => [...prev, updatedStation])
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-200">Radio Curator Dashboard</h2>
        <div className="text-slate-400">
          Accuracy: {curatorStats?.stats.accuracy || 0}% | 
          Rewards: {curatorStats?.stats.totalRewards || 0} PARA
        </div>
      </div>
      
      {/* Pending Reviews */}
      <div>
        <h3 className="text-slate-300 font-medium mb-4">Pending Station Reviews ({pendingStations.length})</h3>
        {pendingStations.map(station => (
          <div key={station.id} className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-slate-200 font-medium">{station.name}</h4>
                <p className="text-slate-500 text-sm">{station.description}</p>
                <p className="text-slate-500 text-xs">
                  {station.queue.length} tracks • {station.genre} • {station.creatorType}
                </p>
              </div>
              <div className="text-slate-400 text-xs">
                Submitted {new Date(station.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            {/* Station preview */}
            <div className="mb-3">
              <h5 className="text-slate-300 text-sm mb-1">Queue Preview:</h5>
              <div className="space-y-1">
                {station.queue.slice(0, 3).map((track, index) => (
                  <div key={track.id} className="text-slate-400 text-xs">
                    {index + 1}. Track {track.trackId}
                  </div>
                ))}
                {station.queue.length > 3 && (
                  <div className="text-slate-500 text-xs">
                    +{station.queue.length - 3} more tracks
                  </div>
                )}
              </div>
            </div>
            
            {/* Review actions */}
            <div className="flex space-x-2">
              <button 
                onClick={() => reviewStation(station.id, 'approve')}
                className="btn-primary text-sm"
              >
                Approve
              </button>
              <button 
                onClick={() => reviewStation(station.id, 'reject')}
                className="btn-danger text-sm"
              >
                Reject
              </button>
              <button 
                onClick={() => hostStation(station.id)}
                className="btn-secondary text-sm"
              >
                Host Station
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Currently Hosted Stations */}
      {hostedStations.length > 0 && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">Currently Hosting ({hostedStations.length})</h3>
          {hostedStations.map(station => (
            <div key={station.id} className="p-4 bg-slate-800/50 border border-green-600/30 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-200 font-medium">{station.name}</h4>
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">LIVE</span>
              </div>
              <p className="text-slate-500 text-sm mb-2">{station.description}</p>
              <p className="text-slate-500 text-xs">
                {station.listeners} listeners • {station.queue.length} tracks in queue
              </p>
              
              <div className="flex space-x-2 mt-3">
                <button className="btn-primary text-sm">Manage Queue</button>
                <button className="btn-secondary text-sm">View Chat</button>
                <button className="btn-danger text-sm">End Broadcast</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 4. **Paradio Curation Section**
```typescript
// frontend/src/components/ParadioCurationSection.tsx
const ParadioCurationSection: React.FC = () => {
  const [curatedStations, setCuratedStations] = useState<ParadioStation[]>([])
  const [featuredStations, setFeaturedStations] = useState<ParadioStation[]>([])
  const [liveStations, setLiveStations] = useState<ParadioStation[]>([])
  
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-slate-200">Curated Radio Stations</h2>
      
      {/* Live Stations */}
      <div>
        <h3 className="text-xl font-medium text-slate-300 mb-4">🔴 Live Now</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveStations.map(station => (
            <div key={station.id} className="p-4 bg-slate-800/50 border border-red-600/30 rounded-lg hover:border-red-500 transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-200 font-medium">{station.name}</h4>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 text-xs">LIVE</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-2">{station.description}</p>
              <p className="text-slate-500 text-xs">
                {station.listeners} listeners • {station.genre}
              </p>
              <p className="text-slate-500 text-xs">
                DJ: {station.djSession.currentDJ}
              </p>
              <button className="btn-primary text-sm mt-2 w-full">Tune In</button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Featured Stations */}
      <div>
        <h3 className="text-xl font-medium text-slate-300 mb-4">Featured</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredStations.map(station => (
            <div key={station.id} className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-200 font-medium">{station.name}</h4>
                <span className="px-2 py-1 bg-gold-600 text-black text-xs rounded">FEATURED</span>
              </div>
              <p className="text-slate-500 text-sm mb-2">{station.description}</p>
              <p className="text-slate-500 text-xs">
                {station.queue.length} tracks • {station.stats.totalListeners} total listeners
              </p>
              <p className="text-slate-500 text-xs">
                Curated by {station.curatorId}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* All Curated Stations */}
      <div>
        <h3 className="text-xl font-medium text-slate-300 mb-4">All Curated</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {curatedStations.map(station => (
            <div key={station.id} className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-all duration-200 cursor-pointer">
              <h4 className="text-slate-200 font-medium mb-2">{station.name}</h4>
              <p className="text-slate-500 text-sm mb-2">{station.description}</p>
              <p className="text-slate-500 text-xs">
                {station.queue.length} tracks • {station.stats.totalListeners} listeners
              </p>
              <p className="text-slate-500 text-xs">
                {station.creatorType === 'artist' ? 'Artist Station' : 'Listener Concept'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Revenue Model

### **Hybrid Revenue Distribution**

#### **Regular Paradio Hours (No Curation)**
```typescript
interface RegularParadioRevenue {
  totalRevenue: number
  distribution: {
    trackCreators: Record<string, number> // 70% - split among track owners
    platform: number // 30% - DIGM platform fee
  }
}
```

#### **Curation Station Hours (Playlist Extensions)**
```typescript
interface CurationStationRevenue {
  totalRevenue: number
  distribution: {
    trackCreators: Record<string, number> // 50% - split among track owners
    playlistCreator: number // 20% - artist/listener who created playlist
    curator: number // 15% - curator who manages the station
    dj: number // 5% - current DJ hosting (if different from curator)
    platform: number // 10% - DIGM platform fee
  }
  
  // Listener PARA sharing during curation mode
  listenerParaSharing: {
    listenerEarns: number // 80% of normal PARA earnings
    playlistCreatorShare: number // 15% of listener's PARA (20% of 75%)
    curatorShare: number // 5% of listener's PARA (20% of 25%)
  }
}

// Example: Listener earns 100 PARA during curation hours
// - Listener keeps: 80 PARA (80%)
// - Playlist creator gets: 15 PARA (15% of listener's earnings)
// - Curator gets: 5 PARA (5% of listener's earnings)
// - Total shared: 20 PARA (20% forfeited by listener)
```

### **Curation Station Rewards**
```typescript
interface CurationStationRewards {
  baseReward: number // Fixed reward per approved playlist-to-station conversion
  schedulingReward: number // Reward for managing scheduled curation hours
  listenerParaShare: number // 5% of listener PARA earnings during curation hours
  accuracyBonus: number // Bonus for high accuracy rating
  engagementBonus: number // Bonus for high listener engagement during curation
  totalReward: number
}
```

---

## Success Metrics

### **Curation Station Engagement**
- **Curation hour listeners**: Average concurrent listeners during scheduled curation
- **Session duration**: Average time listeners stay tuned during curation hours
- **Chat activity**: Community engagement during curation broadcasts
- **Track requests**: Listener interaction with playlist-based programming

### **Curator Performance**
- **Approval accuracy**: How well curator decisions align with community votes
- **Scheduling success**: Station performance during scheduled curation hours
- **Listener retention**: Ability to maintain and grow listener base during curation
- **Revenue generation**: Revenue generated from curation mode vs regular hours

### **Community Engagement**
- **Playlist submissions**: Number of playlist concepts submitted by listeners
- **Voting participation**: Community participation in curator decision voting
- **Curation participation**: Active participation during scheduled curation hours
- **Station discovery**: How often playlist-based stations are discovered through curation

---

## Implementation Timeline

### **Phase 1: Foundation (Weeks 1-2)**
- [ ] Artist playlist creation and submission for curation
- [ ] Basic playlist-to-station conversion system
- [ ] Playlist discovery and preview

### **Phase 2: Listener Submissions (Weeks 3-4)**
- [ ] Listener playlist submission system
- [ ] Basic curation workflow for playlist approval
- [ ] Community voting on playlist-to-station conversions

### **Phase 3: Scheduled Curation (Weeks 5-6)**
- [ ] Curator role application and collateral system
- [ ] Scheduled curation time slot management
- [ ] PARA sharing system during curation hours

### **Phase 4: Advanced Features (Weeks 7-8)**
- [ ] Live broadcasting during scheduled curation hours
- [ ] DJ session management and playlist-based programming
- [ ] Advanced curation algorithms and scheduling
- [ ] Performance optimization and revenue tracking

---

## Conclusion

This Paradio curation station system provides a focused, practical approach to collaborative features that:

1. **Leverages DIGM's Paradio infrastructure** - Uses existing radio platform with scheduled curation
2. **Empowers artists** - Allows them to extend playlists into live radio stations during specific hours
3. **Engages listeners** - Gives them a voice through playlist submissions and PARA sharing incentives
4. **Creates quality control** - Curator system ensures high-quality playlist-to-station conversions
5. **Generates revenue** - Multiple revenue streams with PARA sharing during curation hours
6. **Builds community** - Scheduled curation fosters engagement while preserving regular Paradio programming

The system creates a **hybrid approach** where playlists become live radio stations during scheduled curation hours, with listeners forfeiting 20% of their PARA earnings to playlist creators and curators. This incentivizes quality curation while maintaining the core Paradio experience during regular hours.
