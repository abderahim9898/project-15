import { RequestHandler } from "express";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbynn0NtjrdC1U2cf0IevblQmFeaEyZoX9CexWQQfe9A4c7WgwVYc233i7KE7fc95IpLKg/exec";

const tryFetch = async (url: string, attempt: number = 1): Promise<Response | null> => {
  let timeout: NodeJS.Timeout | null = null;
  try {
    console.log(`\n=== ATTEMPT ${attempt} ===`);
    console.log(`URL: ${url}`);
    console.log(`Time: ${new Date().toISOString()}`);

    const controller = new AbortController();
    timeout = setTimeout(() => {
      console.warn(`Attempt ${attempt}: Request timed out after 30 seconds`);
      controller.abort();
    }, 30000);

    const fetchStart = Date.now();
    console.log(`Starting fetch...`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      signal: controller.signal
    });

    const fetchDuration = Date.now() - fetchStart;
    if (timeout) clearTimeout(timeout);

    console.log(`✓ Response received in ${fetchDuration}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get("content-type")}`);
    console.log(`Content-Length: ${response.headers.get("content-length")}`);

    return response;
  } catch (error) {
    if (timeout) clearTimeout(timeout);

    if (error instanceof Error) {
      console.error(`✗ Attempt ${attempt} failed - ${error.name}: ${error.message}`);
      if (error.name === "AbortError") {
        console.error("  └─ Request was aborted (timeout or cancelled)");
      }
    } else {
      console.error(`✗ Attempt ${attempt} failed - ${String(error)}`);
    }

    return null;
  }
};

export const handleAttendanceData: RequestHandler = async (req, res) => {
  try {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║  Starting Attendance Data Fetch Request            ║");
    console.log("╚══════════════════════════════════���═════════════════╝");
    console.log(`Client IP: ${req.ip}`);
    console.log(`Request Time: ${new Date().toISOString()}`);
    console.log(`User Agent: ${req.get("user-agent")}`);

    let response: Response | null = null;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = await tryFetch(GOOGLE_SCRIPT_URL, attempt);

      if (response && response.ok) {
        console.log(`\n✓ SUCCESS on attempt ${attempt}`);
        break;
      }

      if (response && !response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
      }

      if (attempt < maxRetries) {
        const waitTime = 3000 * attempt;
        console.log(`Waiting ${waitTime}ms before attempt ${attempt + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    if (!response) {
      console.error("\n✗ FATAL: All fetch attempts failed - no response received");
      console.error(`Last error: ${lastError?.message || "Unknown"}`);
      console.error(`\nDiagnostics:`);
      console.error(`  - URL: ${GOOGLE_SCRIPT_URL}`);
      console.error(`  - Environment: Node.js ${process.version}`);
      console.error(`  - Network: Check server internet connectivity`);

      return res.status(503).json({
        error: "Service temporarily unavailable",
        details: "Unable to reach the data source after multiple attempts. The server may have network connectivity issues.",
        timestamp: new Date().toISOString(),
        attempts: maxRetries
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "(unable to read response body)");
      console.error(`\n✗ Response not OK - Status: ${response.status}`);
      console.error(`Response body (first 500 chars): ${errorText.substring(0, 500)}`);

      return res.status(response.status).json({
        error: `Data source error: ${response.status}`,
        details: response.statusText,
        timestamp: new Date().toISOString()
      });
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("\n✗ Failed to parse JSON response");
      console.error(`Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      return res.status(500).json({
        error: "Invalid response format",
        details: "Server returned non-JSON data"
      });
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.error("\n�� Invalid data format: not an array or empty");
      return res.status(400).json({
        error: "Invalid data format",
        details: "Expected array with at least one row"
      });
    }

    console.log(`\n✓ COMPLETE: Successfully retrieved ${data.length} rows`);
    console.log(`First row (header): ${JSON.stringify(data[0]?.slice(0, 5) || "N/A")}`);
    res.json(data);
  } catch (error) {
    console.error("\n✗ EXCEPTION in handleAttendanceData:");
    console.error(error);
    res.status(500).json({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
};
