import Link from "next/link";

/** Renders a centered 404 page with a link back to the home page. */
export default function NotFound() {
  return (
    <div className="flex justify-center items-center min-h-screen text-gray-400 flex-col gap-4">
      <div className="border-2 border-gray-600 rounded-lg bg-gray-800 p-4">
        <h1 className="text-2xl font-bold">404 | Page not found</h1>
      </div>
      <Link href="/" className="mt-4 px-4 py-2 rounded-lg bg-blue-500 text-white">
        Go to home page
      </Link>
    </div>
  );
}
