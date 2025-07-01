export declare const testUsers: {
    user1: {
        id: string;
        address: string;
        name: string;
    };
    user2: {
        id: string;
        address: string;
        name: string;
    };
};
export declare const testServices: {
    restaurant1: {
        id: string;
        name: string;
        category: string;
        location: {
            latitude: number;
            longitude: number;
            address: string;
        };
    };
    hotel1: {
        id: string;
        name: string;
        category: string;
        location: {
            latitude: number;
            longitude: number;
            address: string;
        };
    };
};
export declare const testRecommendations: {
    rec1: {
        author: string;
        serviceId: string;
        category: string;
        rating: number;
        location: {
            latitude: number;
            longitude: number;
            address: string;
        };
        content: {
            title: string;
            body: string;
            media: never[];
        };
        tags: string[];
    };
};
