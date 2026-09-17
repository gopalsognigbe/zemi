export type UserRole = 'client' | 'driver';

export type ServiceType = 'course' | 'livraison_simple' | 'livraison_express';

export type PaymentMethod = 'cash' | 'wallet';

export type RideStatus =
  | 'searching'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DeliveryStatus =
  | 'created'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface FareResult {
  driverPayout: number;
  zemiCommission: number;
  totalPrice: number;
  profile: ServiceType;
}

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface DriverInfo {
  userId: string;
  isOnline: boolean;
  isVerified: boolean;
  lat?: number;
  lng?: number;
  vehicleLabel?: string;
  ratingAvg: number;
  ratingCount: number;
}

export interface Wallet {
  userId: string;
  balance: number;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type:
    | 'topup'
    | 'ride_payment'
    | 'delivery_payment'
    | 'earning'
    | 'commission'
    | 'withdrawal'
    | 'refund'
    | 'adjustment';
  refId?: string;
  createdAt: string;
}

export interface Ride {
  id: string;
  clientId: string;
  driverId?: string;
  pickup: LatLng;
  pickupLabel: string;
  destination: LatLng;
  destinationLabel: string;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  fare: FareResult;
  createdAt: string;
}

export interface Delivery {
  id: string;
  senderId: string;
  driverId?: string;
  deliveryType: 'livraison_simple' | 'livraison_express';
  pickup: LatLng;
  pickupLabel: string;
  dropoff: LatLng;
  dropoffLabel: string;
  recipientPhone: string;
  packageDescription: string;
  packagePhotoUrl?: string;
  status: DeliveryStatus;
  fare: FareResult;
  createdAt: string;
}

export interface Rating {
  id: string;
  driverId: string;
  authorId: string;
  jobType: 'ride' | 'delivery';
  jobId: string;
  stars: number;
  remark?: string;
  createdAt: string;
}
