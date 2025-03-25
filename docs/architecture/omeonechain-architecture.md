graph TD
    subgraph "Application Layer"
        A[Web Interface] --> |API Calls| B[API Layer]
        M[Mobile App] --> |API Calls| B
        N[Third-Party dApps] --> |API Calls| B
    end
    
    subgraph "API Layer"
        B --> |Processes Requests| C[Protocol Layer]
    end
    
    subgraph "Protocol Layer"
        C --> D[Recommendation Engine]
        C --> E[Token Reward System]
        C --> F[Reputation System]
    end
    
    subgraph "Storage Layer"
        D --> |Metadata| G[IOTA Tangle]
        D --> |Full Content| H[IPFS]
        E --> |Transactions| G
        F --> |Updates| G
    end
    
    subgraph "Base Layer"
        G --> |Secures| I[Transaction Validation]
        H --> |References| G
    end
    
    subgraph "User Interactions"
        J[Discovery Seekers] --> |Use| A
        K[Experience Creators] --> |Add Content| A
        L[Service Providers] --> |Create NFTs| A
    end
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#fbb,stroke:#333,stroke-width:2px
    style F fill:#fbb,stroke:#333,stroke-width:2px
    style G fill:#ffb,stroke:#333,stroke-width:2px
    style H fill:#ffb,stroke:#333,stroke-width:2px
