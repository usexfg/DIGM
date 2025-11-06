export interface ArtistProfileData {
  address: string;
  name: string;
  bio: string;
  genres: string[];
  socialLinks: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    spotify?: string;
    website?: string;
  };
}

const KEY = 'digm-artist-profiles-v1';

function loadAll(): Record<string, ArtistProfileData> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, ArtistProfileData>) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export const profileStore = {
  get(address: string): ArtistProfileData | null {
    const all = loadAll();
    return all[address.toLowerCase()] || null;
  },
  set(profile: ArtistProfileData) {
    const all = loadAll();
    all[profile.address.toLowerCase()] = profile;
    saveAll(all);
  }
};







