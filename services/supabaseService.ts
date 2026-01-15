
import { supabase } from '../supabase';
import { User, Passenger, Rider, Ride, Bid, Transaction, LoadRequest, SavedLocation, EmergencyAlert, Coordinates, UserType } from '../types';

export const supabaseService = {
  // Database Health Monitoring
  async checkConnection(): Promise<boolean> {
    try {
      // Check if URL/Key are placeholders
      const client = supabase as any;
      const supabaseUrl = client.supabaseUrl;
      const supabaseKey = client.supabaseKey;

      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey === 'your-anon-key') {
        console.warn("Supabase keys are not configured correctly.");
        return false;
      }

      // Test connectivity with a lightweight query
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
        // If the table doesn't exist, it's a "successful" connection to Supabase but missing schema
        if (error.code === '42P01') {
          console.warn("Supabase connected but 'profiles' table not found. Schema needed.");
          return false;
        }
        console.error("Supabase connection test failed:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Critical connection failure:", e);
      return false;
    }
  },

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const [
        { count: ridesCount },
        { count: ridersCount },
        { count: activeRidersCount },
        { count: passengersCount }
      ] = await Promise.all([
        supabase.from('rides').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'rider'),
        supabase.from('rider_details').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'passenger')
      ]);

      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'admin_fee');
      
      const totalRevenue = revenueData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      return {
        ridesCount: ridesCount || 0,
        ridersCount: ridersCount || 0,
        activeRidersCount: activeRidersCount || 0,
        passengersCount: passengersCount || 0,
        totalRevenue
      };
    } catch (e) {
      return { ridesCount: 0, ridersCount: 0, activeRidersCount: 0, passengersCount: 0, totalRevenue: 0 };
    }
  },

  // Authentication
  async login(username: string, password: string, type: UserType): Promise<User | null> {
    // Admin Override (Hardcoded for prototype access)
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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, rider_details(*)')
        .eq('username', username)
        .eq('user_type', type)
        .single();

      if (error || !data) return null;
      
      return {
        ...data,
        name: data.full_name,
      } as User;
    } catch (e) {
      return null;
    }
  },

  async register(data: any, type: UserType) {
    // 1. Create Profile
    const { data: profile, error: profileError } = await supabase
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

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(`Profile: ${profileError.message} (Code: ${profileError.code})`);
    }

    // 2. Create Rider Details if applicable
    if (type === 'rider') {
      const { error: riderError } = await supabase.from('rider_details').insert({
        profile_id: profile.id,
        license_number: data.licenseNumber,
        gov_id: data.governmentLicenseId,
        vehicle_brand: data.vehicle.brand,
        vehicle_model: data.vehicle.model,
        plate_number: data.vehicle.plateNumber
      });

      if (riderError) {
        console.error("Rider details creation error:", riderError);
        throw new Error(`Rider Details: ${riderError.message}`);
      }
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
    try {
      const { data } = await supabase
        .from('emergency_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    } catch (e) {
      return null;
    }
  },

  async broadcastEmergency(message: string, severity: string) {
    await supabase.from('emergency_alerts').insert({ message, severity });
  }
};
