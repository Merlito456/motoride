
export type UserType = 'passenger' | 'rider' | 'admin';

export interface User {
  id: string;
  email?: string;
  username: string;
  password?: string;
  phone: string;
  name: string;
  userType: UserType;
  createdAt: string;
  isActive: boolean;
  isFlagged?: boolean;
  profileImage?: string;
}

export interface Passenger extends User {
  userType: 'passenger';
  currentBalance: number;
  preferredPaymentMethod: 'cash' | 'load';
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  vehicleType: 'motorcycle' | 'car' | 'tricycle' | 'van';
  color: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;
}

export interface SavedLocation extends Coordinates {
  id: string;
  label: string;
  iconType: 'home' | 'work' | 'other';
}

export interface Rider extends User {
  userType: 'rider';
  vehicle: Vehicle;
  licenseNumber: string;
  governmentLicenseId: string;
  currentLocation: Coordinates;
  isOnline: boolean;
  isAvailable: boolean;
  currentBalance: number;
  totalEarnings: number;
  totalRides: number;
  rating: number;
}

export type RideStatus = 'pending' | 'matched' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';

export interface Bid {
  id: string;
  riderId: string;
  rideId: string;
  bidAmount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  riderId?: string;
  pickupLocation: Coordinates;
  destination: Coordinates;
  routePolyline?: [number, number][]; // New: Stores actual road path
  distance: number;
  baseFare: number;
  biddingEnabled: boolean;
  currentBid?: number;
  bids: Bid[];
  status: RideStatus;
  paymentMethod: 'cash';
  paymentStatus: 'pending' | 'paid' | 'admin_deducted';
  adminFee: number;
  totalFare: number;
  startTime?: string;
  endTime?: string;
  estimatedDuration: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'ride_payment' | 'load_topup' | 'admin_fee' | 'withdrawal' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface LoadRequest {
  id: string;
  riderId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  messages: ChatMessage[];
  createdAt: string;
}

export interface EmergencyAlert {
  id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
}
