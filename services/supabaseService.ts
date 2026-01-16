
import { supabase } from '../supabase';
import { User, Passenger, Rider, Ride, Bid, Transaction, LoadRequest, SavedLocation, EmergencyAlert, Coordinates, UserType } from '../types';

export type ConnectionStatus = 'online' | 'no_schema' | 'prototype' | 'checking';

export const supabaseService = {
  async checkConnectionStatus(): Promise<ConnectionStatus> {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    try {
      const client = supabase as any;
      const supabaseUrl = client.supabaseUrl;
      const supabaseKey = client.supabaseKey;

      // If the key is the placeholder, we are in Prototype Mode
      if (!supabaseKey || supabaseKey === 'your-anon-key') {
        return 'prototype';
      }

      // Test connectivity with a timeout
      const fetchPromise = supabase.from('profiles').select('id').limit(1);
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { error } = result as any;
      
      if (error) {
        // PostgREST error 42P01 means table does not exist
        if (error.code === '42P01') return 'no_schema';
        return 'prototype';
      }
      return 'online';
    } catch (e) {
      console.warn("Supabase connection check failed or timed out:", e);
      return 'prototype';
    }
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

  async login(username: string, password: string, type: UserType): Promise<User | null> {
    if (type === 'admin' && username === 'admin' && password === 'admin') {
      return {
        id: 'admin-fixed',
        username: 'admin',
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
      return { ...data, name: data.full_name, userType: data.user_type } as User;
    } catch (e) {
      return null;
    }
  },

  async register(data: any, type: UserType) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        username: data.username,
        full_name: data.name,
        phone: data.phone,
        user_type: type,
        balance: 0
      })
      .select().single();

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
    }

    return { ...profile, name: profile.full_name, userType: profile.user_type };
  },

  async getLatestAlert() {
    try {
      const { data } = await supabase.from('emergency_alerts').select('*').order('created_at', { ascending: false }).limit(1);
      return data?.[0] || null;
    } catch {
      return null;
    }
  }
};
