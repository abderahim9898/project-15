import { Request, Response } from "express";

export async function handleAdminAuth(_req: Request, res: Response) {
  try {
    const googleSheetUrl =
      "https://script.google.com/macros/s/AKfycbwHvky0ULsONJ-lvYRSlX5sPAhiTu1LwqSWFlaaK2ch_mxkJJx-MRte4p7Haq0ZIg4/exec";

    const response = await fetch(googleSheetUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Google Sheets API returned status ${response.status}: ${response.statusText}`
      );
      return res.status(response.status).json({
        error: "Failed to fetch authentication data",
        status: response.status,
        statusText: response.statusText,
      });
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error(
        `Unexpected content type from Google Sheets: ${contentType}. Response: ${text.substring(0, 200)}`
      );
      return res.status(500).json({
        error: "Invalid response format from Google Sheets",
        receivedContentType: contentType,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function handleGoogleSheetsUpload(req: Request, res: Response) {
  try {
    const { googleScriptUrl, ...payload } = req.body;

    if (!googleScriptUrl) {
      return res.status(400).json({
        error: "googleScriptUrl is required",
      });
    }

    const response = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type");
    let responseData;

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error(
        `Google Sheets API returned status ${response.status}:`,
        responseData
      );
      return res.status(response.status).json({
        error: "Failed to upload to Google Sheets",
        details: responseData,
      });
    }

    res.json(responseData);
  } catch (error) {
    console.error("Google Sheets upload error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
