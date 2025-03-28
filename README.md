# GitHub Copilot Metrics Dashboard

A Next.js application to visualize GitHub Copilot usage metrics for your organization and teams.

## Features

- Organization-wide metrics dashboard
- Team-specific metrics views
- Historical trend analysis
- Team comparisons
- Language and repository breakdowns
- Customizable date ranges

## Recent Improvements

- **Enhanced Security**: Improved authentication using HTTP-only cookies via Next.js API Routes
- **Optimized Data Fetching**: Implemented SWR for efficient caching and revalidation
- **API Optimization**: Parallel API requests for time series data
- **UI/UX Improvements**: Added proper logout functionality and improved loading states
- **Improved Configuration**: Environment variable management and documentation

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- GitHub Personal Access Token with `read:org` and `repo` scopes

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/github-copilot-metrics.git
cd github-copilot-metrics
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file using the template:

```bash
cp .env.local.example .env.local
```

4. Edit the `.env.local` file to configure your GitHub organization and preferences.

5. Start the development server:

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. On the login screen, enter your:
   - GitHub Organization name
   - GitHub Personal Access Token
   - (Optional) Team slugs for team-level metrics

2. Navigate through the dashboard to explore metrics:
   - Organization overview
   - Team-specific views
   - Trends analysis
   - Team comparisons

## Architecture

This project follows Domain-Driven Design principles:

- **Domain Layer**: Core business models and logic
- **Application Layer**: Use cases and service orchestration
- **Infrastructure Layer**: External integrations (GitHub API)
- **UI Layer**: React components and pages

## Technologies

- Next.js 14.x
- React 18.x
- TypeScript
- TailwindCSS
- Recharts
- SWR
- Axios

## License

MIT
