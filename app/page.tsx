import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to the Blog</h1>
      <p className="mb-4">
        <Link href="/blog" className="text-blue-600 hover:underline">
          View all posts →
        </Link>
      </p>
    </div>
  );
}
