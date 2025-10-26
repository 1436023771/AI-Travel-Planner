export type PlanStatus = 'draft' | 'active' | 'completed';

export type ItemType = 'transport' | 'accommodation' | 'attraction' | 'restaurant';

export interface Location {
  lat: number;
  lng: number;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  travelers: number;
  preferences: Record<string, any>;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  plan_id: string;
  day: number;
  type: ItemType;
  title: string;
  description: string;
  location_lat: number;
  location_lng: number;
  address: string;
  time_start: string;
  time_end: string;
  estimated_cost: number;
  booking_info?: Record<string, any>;
  order_index: number;
}

export interface Expense {
  id: string;
  plan_id: string;
  itinerary_item_id?: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  created_at: string;
}

export interface CreatePlanInput {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelers: number;
  preferences: string;
}
