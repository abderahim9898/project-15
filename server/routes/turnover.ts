import { RequestHandler } from "express";

export const handleTurnoverData: RequestHandler = async (_req, res) => {
  try {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║  Starting Turnover Data Fetch Request            ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log("Request Time:", new Date().toISOString());

    const googleScriptUrl =
      "https://script.google.com/macros/s/AKfycbzZ0hXQqn0Io7kwHky_c73CI3IswwZHY2iz5BtmVFlVCdfaWXbJln6GbEPeVf6NZ4a1/exec";
    console.log("Fetching from:", googleScriptUrl);

    const controller = new AbortController();
    const timeoutMs = 45000; // 45 second timeout
    const timeout = setTimeout(() => {
      console.log("Request timeout triggered after", timeoutMs, "ms");
      controller.abort();
    }, timeoutMs);

    const startTime = Date.now();
    console.log("Starting fetch...");

    const response = await fetch(googleScriptUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    console.log("✓ Response received in", duration + "ms");
    console.log("Response status:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Google Script returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✓ Data fetched successfully, records:", Array.isArray(data) ? data.length : "unknown");

    if (Array.isArray(data) && data.length > 1) {
      console.log("✓ First row (header):", data[0]);
      console.log("✓ SUCCESS on attempt 1");
      console.log("✓ COMPLETE: Successfully retrieved", data.length - 1, "rows");
    }

    res.json(data);
  } catch (error) {
    console.error("\n✗ EXCEPTION in handleTurnoverData:");
    console.error(error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);

    // Return data even on error for graceful degradation
    res.status(500).json({
      error: "Failed to fetch turnover data",
      message: errorMessage,
      data: [],
    });
  }
};
