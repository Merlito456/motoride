
import { supabase } from '../supabase';
import { User, Passenger, Rider, Ride, Bid, Transaction, LoadRequest, SavedLocation, EmergencyAlert, Coordinates, UserType } from '../types';

export const supabaseService = {
  // Database Health Monitoring
  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      return !error;
    } catch (e) {
      return false;
    }
  },

  // Authentication
  async login(username: string, password: string, type: UserType): Promise<User | null> {
    // Custom logic for the admin requested
    if (type === 'admin' && username === 'adminrabanes' && password === 'rabanes1994') {
        return {
          id: 'admin-fixed',
          username: 'adminrabanes',
          name: 'System Admin',
          phone: '000',
          userType: 'admin',
          createdAt: new Date().toISOString(),
          isActive: true
        };
    }

    // In a real Supabase Auth setup, you'd use supabase.auth.signInWithPassword
    // For this prototype, we'll query the profiles table directly
    const { data, error } = await supabase
      .from('profiles')
      .select('*, rider_details(*)')
      .eq('username', username)
      .eq('user_type', type)
      .single();

    if (error || !data) return null;
    
    // Simplification: Password check would be handled by Auth normally
    return {
      ...data,
      name: data.full_name,
    } as User;
  },

  async register(data: any, type: UserType) {
    // 1. Create Auth User (Normally)
    // 2. Create Profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        username: data.username,
        full_name: data.name,
        phone: data.phone,
        user_type: type,
        balance: 0
      })
      .select()
      .single();

    if (error) throw error;

    if (type === 'rider') {
      await supabase.from('rider_details').insert({
        profile_id: profile.id,
        license_number: data.licenseNumber,
        gov_id: data.governmentLicenseId,
        vehicle_brand: data.vehicle.brand,
        vehicle_model: data.vehicle.model,
        plate_number: data.vehicle.plateNumber
      });
    }

    return profile;
  },

  // Rides
  async createRide(rideData: Partial<Ride>) {
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: rideData.passengerId,
        pickup_lat: rideData.pickupLocation?.latitude,
        pickup_lng: rideData.pickupLocation?.longitude,
        pickup_name: rideData.pickupLocation?.placeName,
        dest_lat: rideData.destination?.latitude,
        dest_lng: rideData.destination?.longitude,
        dest_name: rideData.destination?.placeName,
        distance: rideData.distance,
        base_fare: rideData.baseFare,
        total_fare: rideData.totalFare,
        bidding_enabled: rideData.biddingEnabled,
        status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActiveRide(userId: string) {
    const { data, error } = await supabase
      .from('rides')
      .select('*, bids(*)')
      .or(`passenger_id.eq.${userId},rider_id.eq.${userId}`)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1);
    
    return data?.[0] || null;
  },

  // Saved Locations
  async getSavedLocations(userId: string) {
    const { data } = await supabase
      .from('saved_locations')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  },

  async saveLocation(userId: string, loc: any) {
    const { data, error } = await supabase
      .from('saved_locations')
      .insert({
        user_id: userId,
        label: loc.label,
        icon_type: loc.iconType,
        lat: loc.latitude,
        lng: loc.longitude,
        place_name: loc.placeName
      })
      .select()
      .single();
    return data;
  },

  // Emergency
  async getLatestAlert() {
    const { data } = await supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    return data?.[0] || null;
  },

  async broadcastEmergency(message: string, severity: string) {
    await supabase.from('emergency_alerts').insert({ message, severity });
  }
};
