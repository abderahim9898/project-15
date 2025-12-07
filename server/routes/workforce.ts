import { RequestHandler } from "express";

export const handleWorkforceData: RequestHandler = async (_req, res) => {
  try {
    console.log("Workforce endpoint called");
    const googleScriptUrl =
      "https://script.google.com/macros/s/AKfycbwnhwQ6b59cGeK4Fi8KpO9yBAb6AuERQ2JpXlEvScg4u1NhZyPo48xAdNrqKtv18hAwNA/exec";
    console.log("Fetching from:", googleScriptUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(googleScriptUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`Google Script returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Data fetched successfully, records:", Array.isArray(data) ? data.length : "unknown");
    res.json(data);
  } catch (error) {
    console.error("Error fetching workforce data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    res.status(500).json({
      error: "Failed to fetch workforce data",
      message: errorMessage,
    });
  }
};
