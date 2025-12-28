# FamilyOS

A family coordination app that helps busy parents manage their week together.

## Features

- **Weekly Planning Ritual** - Sync up with your partner on the week ahead
- **Task Management** - Track family to-dos and prep items
- **Analytics** - Visualize work-life balance between parents
- **Push Notifications** - Stay informed about upcoming events

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials (for authentication)

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Install dependencies: `npm install`
4. Set up the database: `npx prisma db push`
5. Run the development server: `npm run dev`

### Environment Variables

See `.env.example` for all required environment variables.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Lint code

## Tech Stack

- Next.js 14+ (App Router)
- Prisma (PostgreSQL)
- NextAuth.js (Authentication)
- Tailwind CSS (Styling)
- Vitest (Testing)

## License

Private
