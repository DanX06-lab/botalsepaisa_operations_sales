# Route Planner Implementation Report

## Overview
This report documents the implementation of a comprehensive Route Planner feature for the BotalSePaisa Operations Portal. The feature enables operators to plan, execute, and track collection routes with GPS-based optimization.

## Implementation Summary

### Backend Implementation

#### 1. Database Schema
- **Routes Collection**: Created MongoDB collection with schema including:
  - Route metadata (date, status, creator)
  - Home location coordinates
  - Route stops with sequence, shop info, GPS coordinates
  - Distance and duration calculations
  - Status tracking (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
  - Stop status tracking (PENDING, VISITED, SKIPPED)

- **Collections Integration**: Extended collections schema to include:
  - `routeId`: Links collection to a route
  - `routeStopSequence`: Links collection to specific route stop

- **Settings Extension**: Added home location fields:
  - `homeLatitude`: Base location latitude
  - `homeLongitude`: Base location longitude

#### 2. MongoDB Indexes
- Created indexes on routes collection for efficient querying:
  - Unique index on `routeDate` (one route per day)
  - Index on `createdBy` for user-based queries
  - Index on `status` for filtering
- Added index on collections `routeId` for route-based queries

#### 3. Geolocation Utilities (`artifacts/api-server/src/utils/geo.ts`)
- **Haversine Distance Calculation**: Accurate distance calculation between GPS coordinates
- **Coordinate Validation**: Validates latitude (-90 to 90) and longitude (-180 to 180) ranges
- **Travel Time Estimation**: Estimates travel time based on distance (assumes 30 km/h average speed)

#### 4. Routing Algorithm (`artifacts/api-server/src/utils/routing.ts`)
- **Nearest-Neighbor Algorithm**: Optimizes route by visiting nearest unvisited shop
- **Shop Filtering**: Filters shops with valid GPS coordinates
- **Route Generation**: Creates optimized route with:
  - Sequential stops
  - Distance calculations between stops
  - Estimated arrival times
  - Total distance and duration

#### 5. API Endpoints (`artifacts/api-server/src/routes/routes.ts`)
Implemented comprehensive route management endpoints:

- **GET /api/routes/today**: Retrieve today's route
- **GET /api/routes**: List all routes
- **GET /api/routes/eligible-shops**: Get shops with valid GPS for route planning
- **GET /api/routes/:id**: Get specific route details
- **POST /api/routes/generate**: Generate new route with selected shops
- **POST /api/routes/:id/start**: Start a route (PLANNED → IN_PROGRESS)
- **POST /api/routes/:id/complete**: Complete a route (IN_PROGRESS → COMPLETED)
- **POST /api/routes/:id/cancel**: Cancel a route
- **POST /api/routes/:id/regenerate**: Regenerate route with different shops
- **POST /api/routes/:id/stops/:stopId/visit**: Mark stop as visited with optional collection ID
- **POST /api/routes/:id/stops/:stopId/skip**: Skip stop with reason

All endpoints include:
- JWT authentication middleware
- Input validation
- Error handling
- Logging with pino

#### 6. OpenAPI Specification (`lib/api-spec/openapi.yaml`)
- Added route-related schemas and paths
- Defined request/response types
- Added route tag for API organization
- Updated settings schema with home location fields

### Frontend Implementation

#### 1. Route Planner Page (`artifacts/operations-portal/src/pages/routes.tsx`)
Features:
- Date selector for route planning
- Shop selection dialog with GPS availability indicators
- Route summary card with total distance, shops, and estimated duration
- Route status management (Start, Complete)
- Route stop cards with:
  - Stop sequence number
  - Shop name and status badges
  - Distance from previous stop
  - Estimated arrival time
  - Navigation button (opens Google Maps)
  - Collect button (opens collection dialog)
  - Skip button (opens skip reason dialog)
- Return home indicator
- Loading states and error handling

#### 2. Route History Page (`artifacts/operations-portal/src/pages/route-history.tsx`)
Features:
- Month-based filtering
- Summary statistics (routes completed, total distance, shops visited)
- Route list with:
  - Date and status badges
  - Stop summary (visited, skipped, pending counts)
  - Distance and duration information
  - View details button (placeholder for future expansion)

#### 3. Settings Page Enhancement (`artifacts/operations-portal/src/pages/settings.tsx`)
Added GPS capture functionality:
- "Capture Current Location" button using browser Geolocation API
- Manual latitude/longitude input fields
- Validation for coordinate ranges
- Location saved indicator
- Error handling for permission denied, unavailable, timeout scenarios

#### 4. Collection Integration
- When "Collect" button is clicked on a route stop:
  - Opens collection dialog with weight input
  - Shows current rate from settings
  - Displays estimated total
  - On submission:
    - Creates collection record linked to route
    - Marks stop as visited with collection ID
    - Updates route status

#### 5. Navigation Integration
- Navigate button uses Google Maps URL scheme
- Opens device's default map application
- Provides turn-by-turn navigation to shop location

#### 6. API Client Generation
Manually added route API hooks to generated client:
- `useGetTodayRoute`: Fetch today's route
- `useGetEligibleShops`: Fetch shops with GPS
- `useListRoutes`: Fetch all routes
- `useGenerateRoute`: Create new route
- `useStartRoute`: Start route
- `useCompleteRoute`: Complete route
- `useVisitStop`: Mark stop visited
- `useSkipStop`: Skip stop

Added corresponding types to schemas:
- `Route`: Complete route object
- `RouteStop`: Individual stop information
- `RouteGenerateRequest`: Route generation input

#### 7. Navigation
- Added "Route Planner" to sidebar navigation
- Added "Route History" to sidebar navigation
- Updated routing in App.tsx

## Technical Decisions

### Algorithm Choice
- **Nearest-Neighbor**: Chosen for simplicity and reasonable optimization
- **Assumptions**: 30 km/h average speed for travel time estimation
- **Limitations**: Not guaranteed optimal, but provides good results for typical use cases

### Database Design
- **One Route Per Day**: Enforced to prevent confusion
- **Embedded Stops**: Stops stored as array within route document for simplicity
- **Status Tracking**: Both route-level and stop-level status for granular tracking

### Frontend Architecture
- **React Query**: Used for data fetching and caching
- **Shadcn/ui**: Component library for consistent UI
- **Lucide Icons**: Icon library for visual elements
- **Wouter**: Lightweight routing library

### Error Handling
- **Validation**: Server-side validation for all inputs
- **User Feedback**: Toast notifications for success/error states
- **Loading States**: Visual feedback during async operations

## Files Modified/Created

### Backend Files
- `artifacts/api-server/src/routes/routes.ts` (created)
- `artifacts/api-server/src/utils/geo.ts` (created)
- `artifacts/api-server/src/utils/routing.ts` (created)
- `artifacts/api-server/src/routes/settings.ts` (modified)
- `artifacts/api-server/src/routes/collections.ts` (modified)
- `artifacts/api-server/src/routes/index.ts` (modified)
- `artifacts/api-server/src/lib/mongodb.ts` (modified)
- `lib/api-spec/openapi.yaml` (modified)

### Frontend Files
- `artifacts/operations-portal/src/pages/routes.tsx` (created)
- `artifacts/operations-portal/src/pages/route-history.tsx` (created)
- `artifacts/operations-portal/src/pages/settings.tsx` (modified)
- `artifacts/operations-portal/src/App.tsx` (modified)
- `artifacts/operations-portal/src/components/Layout.tsx` (modified)

### API Client Files
- `lib/api-client-react/src/generated/api.ts` (modified)
- `lib/api-client-react/src/generated/api.schemas.ts` (modified)
- `lib/api-zod/src/generated/types/settings.ts` (modified)
- `lib/api-zod/src/generated/types/collectionInput.ts` (modified)

## Testing Recommendations

### Backend Tests
- Unit tests for Haversine distance calculation
- Unit tests for nearest-neighbor algorithm
- Integration tests for route API endpoints
- Tests for route lifecycle transitions
- Tests for stop status management
- Tests for collection integration

### Frontend Tests
- Component tests for Route Planner page
- Component tests for Route History page
- Integration tests for collection dialog
- Tests for GPS capture functionality
- Tests for navigation button behavior

### End-to-End Tests
- Complete route generation workflow
- Route execution with collections
- Route completion workflow
- Route history viewing

## Future Enhancements

### High Priority
- **Map Integration**: Implement Leaflet map for visual route display
- **Real Device Testing**: Test GPS capture and navigation on mobile devices
- **Route Optimization**: Consider more sophisticated algorithms (e.g., 2-opt, genetic algorithms)

### Medium Priority
- **Route Templates**: Save and reuse common routes
- **Traffic Awareness**: Integrate traffic data for better time estimates
- **Multiple Routes**: Support multiple routes per day for different operators
- **Route Sharing**: Share routes between operators

### Low Priority
- **Route Analytics**: Dashboard showing route efficiency metrics
- **Export Routes**: Export routes to CSV or PDF
- **Voice Navigation**: Integrate voice guidance during route execution

## Security Considerations
- All route endpoints protected with JWT authentication
- Input validation on all API endpoints
- GPS coordinates validated for range
- No sensitive data exposed in client-side code

## Performance Considerations
- MongoDB indexes for efficient querying
- React Query caching for reduced API calls
- Lazy loading of route history
- Optimistic updates for better UX

## Conclusion
The Route Planner feature has been successfully implemented with full backend and frontend functionality. The system provides:
- GPS-based route optimization
- Complete route lifecycle management
- Integration with existing collection workflow
- Historical route tracking
- Mobile-friendly navigation

The implementation follows best practices for security, validation, and user experience. The feature is ready for testing on real devices with GPS capabilities.
