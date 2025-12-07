import { RequestHandler } from "express";

export const handleRecruitmentData: RequestHandler = async (_req, res) => {
  const maxRetries = 3;
  const retryDelay = 1000;

  const attemptFetch = async (attempt: number): Promise<Response | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.warn(`Recruitment fetch timeout triggered (attempt ${attempt})`);
        controller.abort();
      }, 35000);

      const googleScriptUrl =
        "https://script.google.com/macros/s/AKfycbyjlSMF3hCNzt9Ifa_jox3NdRAlfHzNYwzaZtdvoZ7YKYY4qyOKQ45M4rdZtX4ryJTu/exec";

      console.log(`Recruitment attempt ${attempt}: Fetching from Google Script...`);

      const response = await fetch(googleScriptUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn(`Recruitment fetch timeout on attempt ${attempt}`);
        return null;
      }
      console.error(`Recruitment fetch network error on attempt ${attempt}:`, fetchError);
      throw fetchError;
    }
  };

  try {
    console.log("Recruitment endpoint called");

    // Set response headers
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = await attemptFetch(attempt);

      if (response) {
        console.log(
          `Recruitment attempt ${attempt} success - Status: ${response.status}, Content-Type: ${response.headers.get("content-type")}`
        );
        break;
      }

      if (attempt < maxRetries) {
        console.log(`Recruitment retry in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    if (!response) {
      console.error("All recruitment fetch attempts failed");
      return res.status(504).json({
        error: "Gateway Timeout",
        message: "Failed to fetch recruitment data after multiple attempts",
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Script error response:", errorText);
      throw new Error(`Google Script returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Data fetched successfully, records:", Array.isArray(data) ? data.length : "unknown");

    // Ensure we're sending valid JSON
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching recruitment data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    res.status(500).json({
      error: "Failed to fetch recruitment data",
      message: errorMessage,
    });
  }
};
