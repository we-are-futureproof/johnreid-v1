# UMC Property Analysis Map - Project Tracker

## Project Overview
A web application that overlays Qualified Census Tracts (QCT) and Difficult Development Areas (DDA) with United Methodist Church (UMC) locations, filters properties by land area, and incorporates Area Median Income (AMI) data from HUD for market targeting.

## Key Terms
- **QCT**: Qualified Census Tract - Census tracts designated by HUD where 50% or more of households have incomes below 60% of the Area Median Gross Income
- **DDA**: Difficult Development Area - Areas with high construction, land, and utility costs relative to area median income
- **UMC**: United Methodist Church
- **AMI**: Area Median Income - The midpoint of a region's income distribution
- **HUD**: U.S. Department of Housing and Urban Development

## Project Requirements
1. Overlay QCT/DDA Zones with UMC Locations
2. Filter results based upon land area of UMC property
3. Utilize Low-Mod Income data to help target specific markets
4. Ensure reliable geocoding for UMC locations in the Nashville area

## Project Roadmap

### Phase 1: Project Setup and Basic Infrastructure
- [x] Define project requirements and scope
- [x] Set up project repository and structure
- [x] Create basic README.md with project information
- [x] Set up development environment
- [x] Configure Supabase connection
- [x] Create initial frontend application structure

### Phase 2: Data Integration
- [x] Connect to Supabase database
- [x] Create data models for UMC properties
- [x] Integrate QCT/DDA zone data
- [x] Integrate Low-Mod Income data
- [x] Set up data fetching services
- [x] Create SQL functions with spatial filtering

### Phase 3: Map Implementation
- [x] Research and select appropriate mapping library (Mapbox GL)
- [x] Implement basic map display
- [x] Add UMC property markers to map
- [x] Overlay QCT/DDA zones on map
- [x] Implement property information display

### Phase 4: Filtering and Analysis Features
- [x] Implement land area filtering
- [x] Implement UMC location geocoding
- [x] Create filtering UI components
- [ ] Implement search functionality
- [ ] Add data export capabilities

### Phase 5: UI/UX Refinement
- [x] Design and implement responsive UI
- [x] Add user-friendly controls
- [ ] Implement accessibility features
- [x] Optimize performance
- [ ] Add helpful tooltips and instructions

### Phase 6: Testing and Deployment
- [x] Test database queries and optimize for performance
- [ ] Implement unit and integration tests
- [x] Fix bugs and address feedback
- [ ] Deploy application to production
- [x] Create documentation for development

## Technology Stack
- **Frontend**: React with TypeScript using Vite
- **Mapping**: Mapbox GL JS via react-map-gl
- **Database**: Supabase with PostgreSQL + PostGIS extension
- **Styling**: Tailwind CSS
- **Deployment**: To be determined

## Current Status
The application has a functional map displaying UMC locations in the Nashville area, along with Qualified Census Tracts (QCT) and Difficult Development Areas (DDA). UMC locations are geocoded with a reliable fallback system for Nashville churches, ensuring consistent data display without relying on external geocoding services.

## Key Achievements
1. **Optimized Supabase Queries**: Implemented spatial filtering for QCT and DDA zones to improve performance and prevent timeouts
2. **Geocoding Solution**: Developed a robust geocoding system for UMC locations with Nashville-focused fallback data
3. **Interactive Map**: Created an interactive map with layer toggles and property filtering by land area
4. **Mobile-Responsive Design**: Built a responsive UI that works well on various screen sizes

## Next Steps
1. Test the application with more real-world data
2. Expand geocoding capabilities beyond Nashville if needed
3. Add search functionality for specific UMC properties
4. Implement additional filtering options and data visualization
