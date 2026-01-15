
import { supabase } from '../supabase';
import { User, Passenger, Rider, Ride, Bid, Transaction, LoadRequest, SavedLocation, EmergencyAlert, Coordinates, UserType } from '../types';

export const supabaseService = {
  // Database Health Monitoring
  async checkConnection(): Promise<boolean> {
    try {
      // We check for a simple count on profiles to verify table existence and connectivity
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (error) {
        console.error("Supabase Connection Error:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // Dashboard Statistics
  async getDashboardStats() {
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

    // Calculate revenue from transactions
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
  },

  async register(data: any, type: UserType) {
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
