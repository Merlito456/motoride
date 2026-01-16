
import { Ride, Bid, Rider, Passenger, User, Transaction, Coordinates, RideStatus, LoadRequest, ChatMessage, EmergencyAlert, UserType, SavedLocation } from '../types';
import { FARE_CONFIG } from '../constants';

const STORAGE_KEYS = {
  RIDES: 'motoride_rides',
  RIDERS: 'motoride_riders',
  PASSENGERS: 'motoride_passengers',
  TRANSACTIONS: 'motoride_transactions',
  BIDS: 'motoride_bids',
  LOAD_REQUESTS: 'motoride_load_requests',
  ALERTS: 'motoride_alerts',
  SAVED_LOCATIONS: 'motoride_saved_locations'
};

const save = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
const load = (key: string, defaultValue: any) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

export const mockBackend = {
  initialize: () => {
    if (!localStorage.getItem(STORAGE_KEYS.RIDERS)) save(STORAGE_KEYS.RIDERS, []);
    if (!localStorage.getItem(STORAGE_KEYS.PASSENGERS)) save(STORAGE_KEYS.PASSENGERS, []);
    if (!localStorage.getItem(STORAGE_KEYS.RIDES)) save(STORAGE_KEYS.RIDES, []);
    if (!localStorage.getItem(STORAGE_KEYS.BIDS)) save(STORAGE_KEYS.BIDS, []);
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) save(STORAGE_KEYS.TRANSACTIONS, []);
    if (!localStorage.getItem(STORAGE_KEYS.LOAD_REQUESTS)) save(STORAGE_KEYS.LOAD_REQUESTS, []);
    if (!localStorage.getItem(STORAGE_KEYS.ALERTS)) save(STORAGE_KEYS.ALERTS, null);
    if (!localStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS)) save(STORAGE_KEYS.SAVED_LOCATIONS, {});
  },

  getRiders: (): Rider[] => load(STORAGE_KEYS.RIDERS, []),
  getPassengers: (): Passenger[] => load(STORAGE_KEYS.PASSENGERS, []),
  getRides: (): Ride[] => load(STORAGE_KEYS.RIDES, []),
  getBids: (): Bid[] => load(STORAGE_KEYS.BIDS, []),
  getTransactions: (): Transaction[] => load(STORAGE_KEYS.TRANSACTIONS, []),
  getLoadRequests: (): LoadRequest[] => load(STORAGE_KEYS.LOAD_REQUESTS, []),

  getSavedLocations: (userId: string): SavedLocation[] => {
    const all = load(STORAGE_KEYS.SAVED_LOCATIONS, {});
    return all[userId] || [];
  },

  saveSavedLocation: (userId: string, location: Omit<SavedLocation, 'id'>) => {
    const all = load(STORAGE_KEYS.SAVED_LOCATIONS, {});
    const userLocations = all[userId] || [];
    const newLoc: SavedLocation = {
      ...location,
      id: `loc-${Date.now()}`
    };
    all[userId] = [...userLocations, newLoc];
    save(STORAGE_KEYS.SAVED_LOCATIONS, all);
    return newLoc;
  },

  deleteSavedLocation: (userId: string, locationId: string) => {
    const all = load(STORAGE_KEYS.SAVED_LOCATIONS, {});
    const userLocations = all[userId] || [];
    all[userId] = userLocations.filter((l: SavedLocation) => l.id !== locationId);
    save(STORAGE_KEYS.SAVED_LOCATIONS, all);
  },

  registerPassenger: (data: Partial<Passenger>): Passenger => {
    const passengers = mockBackend.getPassengers();
    const newPassenger: Passenger = {
      id: `pass-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      currentBalance: 0,
      preferredPaymentMethod: 'cash',
      ...data
    } as Passenger;
    save(STORAGE_KEYS.PASSENGERS, [...passengers, newPassenger]);
    return newPassenger;
  },

  registerRider: (data: Partial<Rider>): Rider => {
    const riders = mockBackend.getRiders();
    const newRider: Rider = {
      id: `rider-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      isOnline: false,
      isAvailable: true,
      rating: 5.0,
      totalRides: 0,
      totalEarnings: 0,
      currentBalance: 0,
      currentLocation: { latitude: 14.5995, longitude: 120.9842 },
      ...data
    } as Rider;
    save(STORAGE_KEYS.RIDERS, [...riders, newRider]);
    return newRider;
  },

  login: (username: string, password: string, type: UserType): User | null => {
    if (type === 'admin') {
      if (username === 'admin' && password === 'admin') {
        return {
          id: 'admin-1',
          name: 'Super Admin',
          username: 'admin',
          phone: '000',
          userType: 'admin',
          createdAt: new Date().toISOString(),
          isActive: true
        };
      }
      return null;
    }

    if (type === 'rider') {
      const riders = mockBackend.getRiders();
      return riders.find(r => r.username === username && r.password === password) || null;
    }

    if (type === 'passenger') {
      const passengers = mockBackend.getPassengers();
      return passengers.find(p => p.username === username && p.password === password) || null;
    }

    return null;
  },

  getTransactionsByUserId: (userId: string): Transaction[] => {
    return mockBackend.getTransactions().filter(t => t.userId === userId);
  },

  toggleFlagUser: (userId: string, userType: 'rider' | 'passenger') => {
    if (userType === 'rider') {
      const riders = mockBackend.getRiders();
      const idx = riders.findIndex(r => r.id === userId);
      if (idx !== -1) {
        riders[idx].isFlagged = !riders[idx].isFlagged;
        save(STORAGE_KEYS.RIDERS, riders);
      }
    } else {
      const passengers = mockBackend.getPassengers();
      const idx = passengers.findIndex(p => p.id === userId);
      if (idx !== -1) {
        passengers[idx].isFlagged = !passengers[idx].isFlagged;
        save(STORAGE_KEYS.PASSENGERS, passengers);
      }
    }
  },

  createLoadRequest: (riderId: string, amount: number): LoadRequest => {
    const requests = mockBackend.getLoadRequests();
    const newRequest: LoadRequest = {
      id: `lr-${Date.now()}`,
      riderId,
      amount,
      status: 'pending',
      messages: [{
        id: `msg-${Date.now()}`,
        senderId: riderId,
        text: `I would like to request a top-up of ₱${amount}.`,
        createdAt: new Date().toISOString()
      }],
      createdAt: new Date().toISOString()
    };
    save(STORAGE_KEYS.LOAD_REQUESTS, [...requests, newRequest]);
    return newRequest;
  },

  sendLoadChatMessage: (requestId: string, senderId: string, text: string) => {
    const requests = mockBackend.getLoadRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      requests[idx].messages.push({
        id: `msg-${Date.now()}`,
        senderId,
        text,
        createdAt: new Date().toISOString()
      });
      save(STORAGE_KEYS.LOAD_REQUESTS, requests);
    }
  },

  approveLoadRequest: (requestId: string) => {
    const requests = mockBackend.getLoadRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx !== -1 && requests[idx].status === 'pending') {
      const req = requests[idx];
      req.status = 'approved';
      mockBackend.topUp(req.riderId, req.amount);
      save(STORAGE_KEYS.LOAD_REQUESTS, requests);
    }
  },

  topUp: (userId: string, amount: number): Passenger | Rider | null => {
    const passengers = mockBackend.getPassengers();
    const passIndex = passengers.findIndex(p => p.id === userId);
    
    if (passIndex !== -1) {
      const balanceBefore = passengers[passIndex].currentBalance;
      passengers[passIndex].currentBalance += amount;
      save(STORAGE_KEYS.PASSENGERS, passengers);
      const transactions = mockBackend.getTransactions();
      transactions.push({
        id: `tx-${Date.now()}`,
        userId,
        type: 'load_topup',
        amount,
        balanceBefore,
        balanceAfter: passengers[passIndex].currentBalance,
        description: 'Wallet Top-up',
        createdAt: new Date().toISOString()
      });
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      return passengers[passIndex];
    }
    
    const riders = mockBackend.getRiders();
    const riderIndex = riders.findIndex(r => r.id === userId);
    if (riderIndex !== -1) {
      const balanceBefore = riders[riderIndex].currentBalance;
      riders[riderIndex].currentBalance += amount;
      save(STORAGE_KEYS.RIDERS, riders);
      const transactions = mockBackend.getTransactions();
      transactions.push({
        id: `tx-${Date.now()}`,
        userId,
        type: 'load_topup',
        amount,
        balanceBefore,
        balanceAfter: riders[riderIndex].currentBalance,
        description: 'Load Balance Approved by Admin',
        createdAt: new Date().toISOString()
      });
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      return riders[riderIndex];
    }
    
    return null;
  },

  createRide: (ride: Partial<Ride>): Ride => {
    const rides = mockBackend.getRides();
    const newRide: Ride = {
      id: `ride-${Date.now()}`,
      status: 'pending',
      bids: [],
      createdAt: new Date().toISOString(),
      adminFee: FARE_CONFIG.ADMIN_FEE,
      paymentStatus: 'pending',
      ...ride
    } as Ride;
    save(STORAGE_KEYS.RIDES, [...rides, newRide]);
    return newRide;
  },

  updateRide: (rideId: string, updates: Partial<Ride>): Ride | null => {
    const rides = mockBackend.getRides();
    const index = rides.findIndex(r => r.id === rideId);
    if (index === -1) return null;
    rides[index] = { ...rides[index], ...updates };
    save(STORAGE_KEYS.RIDES, rides);
    return rides[index];
  },

  placeBid: (bidData: Partial<Bid>): Bid => {
    const bids = mockBackend.getBids();
    const newBid: Bid = {
      id: `bid-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...bidData
    } as Bid;
    save(STORAGE_KEYS.BIDS, [...bids, newBid]);

    const rides = mockBackend.getRides();
    const rideIndex = rides.findIndex(r => r.id === newBid.rideId);
    if (rideIndex !== -1) {
      rides[rideIndex].bids.push(newBid);
      if (!rides[rideIndex].currentBid || newBid.bidAmount < rides[rideIndex].currentBid) {
        rides[rideIndex].currentBid = newBid.bidAmount;
        rides[rideIndex].totalFare = newBid.bidAmount + rides[rideIndex].adminFee;
      }
      save(STORAGE_KEYS.RIDES, rides);
    }
    return newBid;
  },

  acceptBid: (rideId: string, bidId: string): Ride | null => {
    let rides = mockBackend.getRides();
    let allBids = mockBackend.getBids();
    const rideIndex = rides.findIndex(r => r.id === rideId);
    if (rideIndex === -1) return null;
    const globalBidIndex = allBids.findIndex(b => b.id === bidId);
    if (globalBidIndex === -1) return null;
    const acceptedBid = allBids[globalBidIndex];
    const riderId = acceptedBid.riderId;
    allBids = allBids.map(bid => {
      if (bid.id === bidId) return { ...bid, status: 'accepted' };
      if (bid.rideId === rideId && bid.status === 'pending') return { ...bid, status: 'rejected' };
      if (bid.riderId === riderId && bid.status === 'pending') return { ...bid, status: 'rejected' };
      return bid;
    });
    rides = rides.map(r => {
      const updatedInternalBids = r.bids.map(rb => {
        const matchingGlobalBid = allBids.find(gb => gb.id === rb.id);
        return matchingGlobalBid ? matchingGlobalBid : rb;
      });
      if (r.id === rideId) {
        return {
          ...r,
          riderId: riderId,
          status: 'accepted',
          totalFare: acceptedBid.bidAmount + r.adminFee,
          bids: updatedInternalBids
        };
      }
      return { ...r, bids: updatedInternalBids };
    });
    const riders = mockBackend.getRiders();
    const riderIdx = riders.findIndex(rid => rid.id === riderId);
    if (riderIdx !== -1) {
      riders[riderIdx].isAvailable = false;
      save(STORAGE_KEYS.RIDERS, riders);
    }
    save(STORAGE_KEYS.BIDS, allBids);
    save(STORAGE_KEYS.RIDES, rides);
    return rides[rideIndex];
  },

  completeRide: (rideId: string): Ride | null => {
    const rides = mockBackend.getRides();
    const rideIndex = rides.findIndex(r => r.id === rideId);
    if (rideIndex === -1) return null;
    const ride = rides[rideIndex];
    ride.status = 'completed';
    ride.endTime = new Date().toISOString();
    ride.paymentStatus = 'paid';
    const riders = mockBackend.getRiders();
    const riderIndex = riders.findIndex(r => r.id === ride.riderId);
    if (riderIndex !== -1) {
      const rider = riders[riderIndex];
      rider.totalRides += 1;
      rider.totalEarnings += (ride.totalFare - ride.adminFee);
      rider.currentBalance -= ride.adminFee;
      rider.isAvailable = true;
      save(STORAGE_KEYS.RIDERS, riders);
      const transactions = mockBackend.getTransactions();
      transactions.push({
        id: `tx-${Date.now()}`,
        userId: rider.id,
        type: 'admin_fee',
        amount: -ride.adminFee,
        balanceBefore: rider.currentBalance + ride.adminFee,
        balanceAfter: rider.currentBalance,
        referenceId: rideId,
        description: `Admin fee for ride ${rideId}`,
        createdAt: new Date().toISOString()
      });
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
    }
    save(STORAGE_KEYS.RIDES, rides);
    return ride;
  },

  updateRiderLocation: (riderId: string, location: Coordinates) => {
    const riders = mockBackend.getRiders();
    const index = riders.findIndex(r => r.id === riderId);
    if (index !== -1) {
      riders[index].currentLocation = location;
      save(STORAGE_KEYS.RIDERS, riders);
    }
  },

  sendEmergency: (message: string, severity: 'high' | 'medium' | 'low') => {
    const alert: EmergencyAlert = {
      id: `alert-${Date.now()}`,
      message,
      severity,
      createdAt: new Date().toISOString()
    };
    save(STORAGE_KEYS.ALERTS, alert);
    return alert;
  },

  getLatestEmergency: (): EmergencyAlert | null => {
    return load(STORAGE_KEYS.ALERTS, null);
  },

  clearEmergency: () => {
    save(STORAGE_KEYS.ALERTS, null);
  }
};
