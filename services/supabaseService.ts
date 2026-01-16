
import { supabase } from '../supabase';
import { User, Passenger, Rider, Ride, Bid, Transaction, LoadRequest, SavedLocation, EmergencyAlert, Coordinates, UserType } from '../types';

export type ConnectionStatus = 'online' | 'no_schema' | 'prototype' | 'checking';

// Helper to convert DB snake_case to App camelCase for Bids
const mapBidFromDB = (dbBid: any): Bid => ({
  id: dbBid.id,
  rideId: dbBid.ride_id,
  riderId: dbBid.rider_id,
  bidAmount: Number(dbBid.amount),
  status: dbBid.status,
  createdAt: dbBid.created_at,
  message: dbBid.message
});

// Helper to convert DB snake_case to App camelCase for Rides
const mapRideFromDB = (dbRide: any): Ride => ({
  id: dbRide.id,
  passengerId: dbRide.passenger_id,
  riderId: dbRide.rider_id,
  pickupLocation: {
    latitude: dbRide.pickup_lat,
    longitude: dbRide.pickup_lng,
    placeName: dbRide.pickup_name
  },
  destination: {
    latitude: dbRide.dest_lat,
    longitude: dbRide.dest_lng,
    placeName: dbRide.dest_name
  },
  distance: dbRide.distance,
  baseFare: Number(dbRide.base_fare),
  adminFee: Number(dbRide.admin_fee),
  totalFare: Number(dbRide.total_fare),
  status: dbRide.status,
  biddingEnabled: dbRide.bidding_enabled,
  paymentMethod: dbRide.payment_method,
  paymentStatus: dbRide.payment_status,
  createdAt: dbRide.created_at,
  estimatedDuration: Math.round(dbRide.distance * 2.5),
  routePolyline: dbRide.route_polyline, // Assuming added to schema
  bids: dbRide.bids ? dbRide.bids.map(mapBidFromDB) : []
});

const mapRiderFromDB = (data: any): Rider => ({
  id: data.id,
  username: data.username,
  name: data.full_name,
  phone: data.phone,
  userType: 'rider',
  createdAt: data.created_at,
  isActive: data.is_active,
  isFlagged: data.is_flagged,
  currentBalance: Number(data.balance),
  isOnline: data.rider_details?.is_online || false,
  isAvailable: data.rider_details?.is_available || true,
  rating: Number(data.rider_details?.rating || 5),
  totalRides: data.rider_details?.total_rides || 0,
  totalEarnings: 0,
  licenseNumber: data.rider_details?.license_number || '',
  governmentLicenseId: data.rider_details?.gov_id || '',
  currentLocation: {
    latitude: data.rider_details?.lat || 14.5995,
    longitude: data.rider_details?.lng || 120.9842
  },
  vehicle: {
    id: data.rider_details?.profile_id || '',
    plateNumber: data.rider_details?.plate_number || '',
    vehicleType: data.rider_details?.vehicle_type || 'motorcycle',
    brand: data.rider_details?.vehicle_brand || '',
    model: data.rider_details?.vehicle_model || '',
    color: '',
    year: 0,
    capacity: 1
  }
});

const mapPassengerFromDB = (data: any): Passenger => ({
  id: data.id,
  username: data.username,
  name: data.full_name,
  phone: data.phone,
  userType: 'passenger',
  createdAt: data.created_at,
  isActive: data.is_active,
  isFlagged: data.is_flagged,
  currentBalance: Number(data.balance),
  preferredPaymentMethod: 'cash'
});

// Helper to convert DB snake_case to App camelCase for Transactions
const mapTransactionFromDB = (data: any): Transaction => ({
  id: data.id,
  userId: data.user_id,
  type: data.type,
  amount: Number(data.amount),
  balanceBefore: Number(data.balance_before),
  balanceAfter: Number(data.balance_after),
  referenceId: data.reference_id,
  description: data.description,
  createdAt: data.created_at
});

// Helper to convert DB snake_case to App camelCase for LoadRequests
const mapLoadRequestFromDB = (data: any): LoadRequest => ({
  id: data.id,
  riderId: data.rider_id,
  amount: Number(data.amount),
  status: data.status,
  messages: data.messages || [],
  createdAt: data.created_at
});

export const supabaseService = {
  async checkConnectionStatus(): Promise<ConnectionStatus> {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 2500)
    );

    try {
      const client = supabase as any;
      const supabaseKey = client.supabaseKey;

      if (!supabaseKey || supabaseKey === 'sb_publishable_IQvPHklDRCSOfBd_w4FPjQ_gqWdC8gs' === false && supabaseKey === 'your-anon-key') {
        return 'prototype';
      }

      const fetchPromise = supabase.from('profiles').select('id').limit(1);
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { error } = result as any;
      
      if (error) {
        if (error.code === '42P01') return 'no_schema';
        return 'prototype';
      }
      return 'online';
    } catch (e) {
      return 'prototype';
    }
  },

  async login(username: string, password: string, type: UserType): Promise<User | null> {
    if (type === 'admin' && username === 'admin' && password === 'admin') {
      return { id: 'admin-fixed', username: 'admin', name: 'System Admin', phone: '000', userType: 'admin', createdAt: new Date().toISOString(), isActive: true };
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*, rider_details(*)').eq('username', username).eq('user_type', type).single();
      if (error || !data) return null;
      if (type === 'rider') return mapRiderFromDB(data);
      if (type === 'passenger') return mapPassengerFromDB(data);
      return { ...data, name: data.full_name, userType: data.user_type } as User;
    } catch { return null; }
  },

  async register(data: any, type: UserType) {
    const { data: profile, error: profileError } = await supabase.from('profiles').insert({
      username: data.username,
      full_name: data.name,
      phone: data.phone,
      user_type: type,
      balance: 0
    }).select().single();

    if (profileError) throw profileError;

    if (type === 'rider' && profile) {
      await supabase.from('rider_details').insert({
        profile_id: profile.id,
        license_number: data.licenseNumber,
        gov_id: data.governmentLicenseId,
        vehicle_brand: data.vehicle.brand,
        vehicle_model: data.vehicle.model,
        plate_number: data.vehicle.plateNumber
      });
      return mapRiderFromDB({ ...profile, rider_details: { profile_id: profile.id, ...data } });
    }
    return mapPassengerFromDB(profile);
  },

  async getAllRiders(): Promise<Rider[]> {
    const { data, error } = await supabase.from('profiles').select('*, rider_details(*)').eq('user_type', 'rider');
    if (error || !data) return [];
    return data.map(mapRiderFromDB);
  },

  async getAllPassengers(): Promise<Passenger[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_type', 'passenger');
    if (error || !data) return [];
    return data.map(mapPassengerFromDB);
  },

  async getAllRides(): Promise<Ride[]> {
    const { data, error } = await supabase.from('rides').select('*, bids(*)').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapRideFromDB);
  },

  async getRideById(rideId: string): Promise<Ride | null> {
    const { data, error } = await supabase.from('rides').select('*, bids(*)').eq('id', rideId).single();
    if (error || !data) return null;
    return mapRideFromDB(data);
  },

  async updateRideStatus(rideId: string, status: string) {
    const { error } = await supabase.from('rides').update({ status }).eq('id', rideId);
    return !error;
  },

  async createRide(ride: Partial<Ride>): Promise<Ride | null> {
    const { data, error } = await supabase.from('rides').insert({
      passenger_id: ride.passengerId,
      pickup_lat: ride.pickupLocation?.latitude,
      pickup_lng: ride.pickupLocation?.longitude,
      pickup_name: ride.pickupLocation?.placeName,
      dest_lat: ride.destination?.latitude,
      dest_lng: ride.destination?.longitude,
      dest_name: ride.destination?.placeName,
      distance: ride.distance,
      base_fare: ride.baseFare,
      total_fare: ride.totalFare,
      bidding_enabled: ride.biddingEnabled,
      route_polyline: ride.routePolyline,
      status: 'pending'
    }).select('*, bids(*)').single();

    if (error || !data) return null;
    return mapRideFromDB(data);
  },

  async placeBid(bid: Partial<Bid>) {
    const { error } = await supabase.from('bids').insert({
      ride_id: bid.rideId,
      rider_id: bid.riderId,
      amount: bid.bidAmount,
      message: bid.message,
      status: 'pending'
    });
    return !error;
  },

  async acceptBid(rideId: string, bidId: string, riderId: string, amount: number) {
    // Transactional logic for accepting a bid
    const { error: bidError } = await supabase.from('bids').update({ status: 'accepted' }).eq('id', bidId);
    if (bidError) return false;

    // Reject other bids for this ride
    await supabase.from('bids').update({ status: 'rejected' }).eq('ride_id', rideId).neq('id', bidId).eq('status', 'pending');

    // Update ride status and total fare
    const { error: rideError } = await supabase.from('rides').update({ 
      rider_id: riderId,
      status: 'accepted',
      total_fare: amount + 5.0 // amount + admin_fee
    }).eq('id', rideId);

    // Update rider availability
    await supabase.from('rider_details').update({ is_available: false }).eq('profile_id', riderId);

    return !rideError;
  },

  // Fix: Added missing getAllTransactions method
  async getAllTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapTransactionFromDB);
  },

  // Fix: Added missing getAllLoadRequests method
  async getAllLoadRequests(): Promise<LoadRequest[]> {
    const { data, error } = await supabase.from('load_requests').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapLoadRequestFromDB);
  },

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
      const { data: revenueData } = await supabase.from('transactions').select('amount').eq('type', 'admin_fee');
      const totalRevenue = revenueData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
      return { ridesCount: ridesCount || 0, ridersCount: ridersCount || 0, activeRidersCount: activeRidersCount || 0, passengersCount: passengersCount || 0, totalRevenue };
    } catch {
      return { ridesCount: 0, ridersCount: 0, activeRidersCount: 0, passengersCount: 0, totalRevenue: 0 };
    }
  },

  async getLatestAlert() {
    try {
      const { data } = await supabase.from('emergency_alerts').select('*').order('created_at', { ascending: false }).limit(1);
      return data?.[0] || null;
    } catch { return null; }
  },

  async sendEmergencyAlert(message: string, severity: string) {
    const { error } = await supabase.from('emergency_alerts').insert({ message, severity });
    return !error;
  }
};
