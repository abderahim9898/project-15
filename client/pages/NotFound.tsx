import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto text-center py-12 sm:py-20">
        <h1 className="text-6xl sm:text-8xl font-bold text-accent mb-4">404</h1>
        <p className="text-xl sm:text-2xl text-primary font-semibold mb-2">
          Page Not Found
        </p>
        <p className="text-base sm:text-lg text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Return to Dashboard
        </Link>
      </div>
    </Layout>
  );
};

export default NotFound;
