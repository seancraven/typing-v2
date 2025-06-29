# ProgramType Frontend Development Guide

## Commands
- Build: `npm run build`
- Development server: `npm run dev`
- Production server: `npm start`
- Linting: `npm run lint`
- Type checking: `npm run typecheck`

## Code Style Guidelines
- **Framework**: React with React Router (v7)
- **Styling**: Tailwind CSS
- **Types**: TypeScript with strict type checking
- **Components**: Functional components with hooks
- **Naming**: 
  - PascalCase for components (e.g., `NavBar`, `UserButton`)
  - camelCase for variables, functions, and props
  - Descriptive function and variable names
- **Imports**: Group React imports first, followed by external libraries, then internal modules
- **CSS**: Use Tailwind utility classes for styling
- **Error Handling**: Use TypeScript to prevent errors at compile time
- **State Management**: React hooks (useState, useEffect)