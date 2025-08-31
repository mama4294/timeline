# General Coding Guidance

## General Behavior

- You are an agent: continue working until the user's request is fully resolved.
  Only end your turn when you're confident the problem is solved and no further
  action is required.

- Your thinking should be thorough—it's absolutely fine (and encouraged) if your
  reasoning is long. Think step by step before and after each action you take.

- Plan extensively before making any function calls. Reflect critically after
  each one. Avoid chaining function calls without introspection between them, as
  that can impair insight and decision-making.

- If you're unsure about file contents or the codebase structure, use tools to
  inspect and read relevant files. Never guess or make assumptions.

- Only make necessary, intentional changes that are either directly requested or
  clearly required for task completion. Avoid editing unrelated or unclear areas.

## Code Quality and Style

- Prefer simple solutions that are easy to understand and maintain.

- Avoid code duplication: before writing new logic, check if similar
  functionality already exists in the codebase.

- Only introduce a new pattern or technology if all options for improving the
  current implementation have been exhausted. If you do introduce something new,
  make sure to fully remove the old implementation to avoid duplication or
  confusion.

- Keep the codebase clean and organized. Use consistent patterns and naming
  conventions where applicable.

- Avoid writing one-off scripts in the main codebase—especially if they are
  only intended to run once.

- Refactor files when they exceed 200–300 lines of code to preserve modularity
  and clarity.

- Never overwrite the .env file without asking for and receiving explicit
  confirmation.

- Follow best practices around formatting and consistency. Use linters,
  formatters, and style guides where appropriate.

## Coding Workflow

- Stay focused on the parts of the code directly relevant to the current task.

- Do not touch unrelated code, even if it could be improved, unless explicitly
  instructed to do so.

- Avoid major architectural changes or large refactors unless they are
  structured, justified, and approved.

- Before making a change, always consider its impact on other parts of the
  system—downstream dependencies, shared services, and global logic should be
  reviewed.

- Document or summarize your reasoning and decision-making if a change affects
  multiple components.

# Building Power Apps Code Apps

Follow these steps in order to create a complete Power Apps Code App:

1. **Create a React App with Vite** - Set up the foundation
2. **Configure for Power Apps Code App** - Add Power Platform SDK integration
3. **Install Fluent UI v9** - Add the UI framework
4. **Build app to work locally with mocked data** - Develop and test locally
5. **Configure the app to run in Power Apps** - Set up Power Platform integration
6. **Wire up to real connectors** - Connect to live data sources
7. **Test and deploy** - Final testing and deployment

---

## Step 1: Create a React App with Vite

Always use TypeScript for better type safety and development experience.

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm i --save-dev @types/node
```

Replace `my-app` with the name of the app provided by the user.

## IMPORTANT NOTE: You will need to downgrade to react 18 for use with Fluent v9.

## Step 2: Configure for Power Apps Code App

### Update Vite Configuration

Update your `vite.config.ts` to ensure proper configuration:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  server: {
    host: "::",
    port: 3000, // Important: Power Apps Code Apps require port 3000
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Critical TypeScript Configuration

Update `tsconfig.app.json` to set `verbatimModuleSyntax` to `false`:

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false
  }
}
```

This is required to work with the Power SDK generated code.

### Install Power Platform SDK

Install the Power Platform SDK (currently from GitHub release):

```bash
npm install --save-dev "@pa-client/power-code-sdk@https://github.com/microsoft/PowerAppsCodeApps/releases/download/v0.0.2/6-18-pa-client-power-code-sdk-0.0.1.tgz"
```

### Update Package.json Scripts

Update the dev script in `package.json`:

```json
{
  "scripts": {
    "dev": "start pac code run && vite",
    "build": "tsc -b && vite build"
  }
}
```

**Note for macOS users**: Remove `start` from the dev script:

```json
{
  "scripts": {
    "dev": "vite && pac code run"
  }
}
```

### Create PowerProvider Component

Create `src/PowerProvider.tsx` with the following content:

```typescript
import React from "react";
import { PowerProvider as Provider } from "@pa-client/power-code-sdk";

interface PowerProviderProps {
  children: React.ReactNode;
}

const PowerProvider: React.FC<PowerProviderProps> = ({ children }) => {
  return <Provider>{children}</Provider>;
};

export default PowerProvider;
```

### Update main.tsx

Update `src/main.tsx` to include the PowerProvider:

```typescript
  <StrictMode>
    <PowerProvider>
      <App />
    </PowerProvider>
  </StrictMode>,
```

---

## Step 3: Install Fluent UI v9

### Install Fluent UI Packages

```bash
npm install @fluentui/react-components @fluentui/react-icons
```

### FluentProvider Setup

Wrap your app with FluentProvider for consistent theming:

```typescript
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
} from "@fluentui/react-components";

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      {/* Your app content */}
    </FluentProvider>
  );
}
```

### Critical Implementation Rules for DataGrids

1. **Server-Side Only**: Never implement client-side sorting with compare functions
2. **Responsive Design**: Always provide both desktop table and mobile card views
3. **Loading States**: Include skeleton components for all data loading states
4. **Column Resizing**: Use columnSizingOptions with proper width constraints
5. **Pagination**: Reset to page 1 when changing sort or filter parameters
6. **Accessibility**: Implement proper ARIA labels and keyboard navigation

### Reference Documentation

- [Fluent UI DataGrid Documentation](https://fluentuipr.z22.web.core.windows.net/heads/master/public-docsite-v9/storybook/?path=/docs/components-datagrid--default)
- [Resizable Columns Example](https://github.com/microsoft/fluentui/blob/938a069ea4e0c460050e0dc147b9786e144cb6d3/packages/react-components/react-table/stories/src/DataGrid/ResizableColumns.stories.tsx)

### Common Implementation Patterns

- Use `makeStyles` for consistent styling with design tokens
- Implement `useEffect` hooks for data loading on parameter changes
- Use `useMemo` for column definitions to prevent unnecessary re-renders
- Handle loading, error, and empty states appropriately
- Implement proper accessibility with ARIA labels and keyboard navigation
- Use proper TypeScript interfaces for type safety

---

## Step 4: Build App to Work Locally with Mocked Data

### Data Access Service Interface Pattern

- Define TypeScript interfaces for all data operations (CRUD, search, pagination)
- Create contracts that both mock and real services will implement
- Ensure strongly-typed parameters and return types for all operations

- Implement singleton factory to manage service instances
- Allow runtime switching between mock and real services
- Provide single point of configuration for the entire application

#### Mock Services (Initial Implementation)

- Create mock implementations that simulate real data operations
- Include realistic test data and proper pagination/filtering simulation
- Provide comprehensive logging for development debugging
- **Start here - implement mock services first**

#### Real Services (Future Implementation)

- **Do not implement initially - focus on mock services**
- **Stored procedure names will be determined later**
- Will integrate with Power Apps generated service classes
- Must maintain same interface as mock services

### Accessibility Guidelines

#### ARIA Best Practices

- Always include `aria-label` or `aria-labelledby` for interactive elements
- Use `aria-describedby` for additional context
- Implement proper focus management with `tabIndex`
- Use semantic HTML elements when possible

#### Keyboard Navigation

- Ensure all interactive elements are keyboard accessible
- Implement proper tab order with `tabIndex`
- Use arrow keys for grid navigation
- Provide skip links for long content

#### Color and Contrast

- Use Fluent UI design tokens for consistent colors
- Ensure minimum contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color to convey information

### Performance Optimization

#### React Best Practices

- Use `useMemo` and `useCallback` for expensive computations
- Implement proper dependency arrays in `useEffect`
- Use `React.memo` for components that don't need frequent re-renders
- Implement proper key props for lists

#### Data Loading Patterns

- Implement server-side pagination for large datasets
- Use loading skeletons instead of spinners
- Implement proper error boundaries
- Cache API responses where appropriate

#### Bundle Optimization

- Use dynamic imports for code splitting
- Implement proper tree shaking
- Optimize images and assets
- Use Vite's built-in optimization features

### Responsive Design Guidelines

#### Mobile-First Approach

- Design for mobile screens first, then enhance for larger screens
- Use Fluent UI's responsive breakpoints
- Implement touch-friendly interactions (minimum 44px tap targets)

#### Layout Patterns

- Use CSS Grid and Flexbox for responsive layouts
- Implement proper viewport meta tags
- Use relative units (rem, em, %) instead of fixed pixels
- Test on various screen sizes and orientations

#### Component Responsiveness

- Provide alternative layouts for different screen sizes
- Use compound components for complex responsive patterns
- Implement proper overflow handling
- Consider content hierarchy on smaller screens

### Local Development Testing

```bash
npm run dev
```

This starts both the Vite development server and Power SDK server.

---

## Step 5: Configure the App to Run in Power Apps

### Power Platform Setup

First release environment is required. Confirm with the user:

```bash
pac admin create --name 'Code Apps' --region 'unitedstatesfirstrelease' --type 'Developer'
```

Authenticate and select environment:

```bash
pac auth create --environment {environment id}
pac auth who  # Verify correct environment is selected
```

### Initialize Power Apps Code App

Configure the Power Apps Code App:

```bash
pac code init --displayName "My App" -l "[location of the vite.svg]"
```

**Note:** Replace "My App" with the actual app name provided by the user.
Replace [location of the vite.svg] with the real location

---

## Step 6: Wire Up to Real Connectors

Initially use mocked data for development. Once the app is ready, replace with
actual data sources.

Confirm everything is working with mocked data before integrating with real
data sources.

### Get Connection IDs

List available connections to find the connection ID:

```bash
pac connection list
```

This will show all available connections with their IDs and names.

### Add Office 365 Connection

For Office 365 Users:

```bash
pac code add-data-source -a "shared_office365users" -c <connectionId>
```

### Add SQL Data Source

Discover the stored procedures available in your database using the MSSQL tool
or ask the user to provide them.

Example stored procedures for a typical CRUD application:

```bash
pac code add-data-source -a "shared_sql" -c <connectionId> \
  -sp "sp_CreateClient" -d "server.database.windows.net,database"
```

**Note:** Replace the stored procedure names and server name with the actual
procedures available in your database. Ask the user to provide their specific
stored procedure names or use the MSSQL tool to discover them.

---

## Step 7: Test and Deploy

### Build and Deploy

```bash
npm run build
pac code push
```

### Common Issues and Troubleshooting

- **Port 3000 Required**: Power Apps Code Apps require port 3000
- **PowerProvider Issues**: Ensure PowerProvider.tsx is properly configured
- **Build Errors**: Run `npm run build` before deploying
- **Authentication**: Use same browser profile as Power Platform tenant
