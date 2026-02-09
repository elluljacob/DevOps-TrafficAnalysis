

# How Next.js App Router works

Each folder inside app/api/ becomes a route segment

Each route.ts file defines the HTTP methods for that segment

So in App Router:

```
app/
└─ api/
   ├─ stats/
   │  └─ route.ts   ← GET /api/stats
   ├─ users/
   │  └─ route.ts   ← GET /api/users
```

You cannot have multiple top-level “GET paths” in a single route.ts like in Express

One file = one route path (/api/something)