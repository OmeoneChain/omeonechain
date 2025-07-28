"use client";

import { RestaurantProfile } from '../../../code/poc/core/src/components/restaurant/RestaurantProfile';
import { useParams } from 'next/navigation';

export default function RestaurantProfilePage() {
  const params = useParams();
  const restaurantId = params.id as string;

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Not Found</h1>
          <p className="mt-2 text-gray-600">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantProfile restaurantId={restaurantId} />
     </div>
  );
}