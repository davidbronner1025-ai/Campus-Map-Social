import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCampus } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export default function RootRedirect() {
  const [, setLocation] = useLocation();
  const { data: campus, isLoading, isError } = useGetCampus({
    query: { retry: false }
  });

  useEffect(() => {
    if (!isLoading) {
      if (isError || !campus) {
        setLocation("/setup");
      } else {
        setLocation("/locations");
      }
    }
  }, [isLoading, isError, campus, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h2 className="text-xl font-display font-semibold animate-pulse">Loading Campus Workspace...</h2>
    </div>
  );
}
