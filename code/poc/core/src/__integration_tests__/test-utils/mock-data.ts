export const testUsers = {
  user1: {
    id: 'user1',
    address: '0xuser1address00000000000000000000000000000',
    name: 'Test User 1'
  },
  user2: {
    id: 'user2',
    address: '0xuser2address00000000000000000000000000000',
    name: 'Test User 2'
  }
};

export const testServices = {
  restaurant1: {
    id: 'restaurant1',
    name: 'Test Restaurant 1',
    category: 'restaurant',
    location: {
      latitude: 40.7128,
      longitude: -74.006,
      address: 'New York, NY'
    }
  },
  hotel1: {
    id: 'hotel1',
    name: 'Test Hotel 1',
    category: 'hotel',
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      address: 'Los Angeles, CA'
    }
  }
};

export const testRecommendations = {
  rec1: {
    author: testUsers.user1.id,
    serviceId: testServices.restaurant1.id,
    category: 'restaurant',
    rating: 5,
    location: testServices.restaurant1.location,
    content: {
      title: 'Amazing Restaurant',
      body: 'The food was delicious and the service was excellent.',
      media: []
    },
    tags: ['italian', 'pasta', 'nyc']
  }
};
