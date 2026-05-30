import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const SelfVerifySchema = z.object({
  address: z.string().describe("Celo wallet address to verify"),
  credentialType: z.enum(["passport", "national_id", "drivers_license"]).optional().default("passport")
});

export type SelfVerifyInput = z.infer<typeof SelfVerifySchema>;

export async function selfVerify(args: SelfVerifyInput) {
  const { address, credentialType = "passport" } = args;

  const apiKey = process.env.SELF_API_KEY;
  if (!apiKey || apiKey === "your_self_protocol_api_key") {
    return {
      verified: false,
      message: "SELF_API_KEY not configured. Add it to your .env file."
    };
  }

  const url = `https://api.self.xyz/v1/verify?address=${encodeURIComponent(address)}&credentialType=${encodeURIComponent(credentialType)}`;

  try {
    console.error(`[Self Verify] Calling API for address ${address}...`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    if (response.status === 404) {
      return {
        address,
        verified: false,
        credentialType,
        expiresAt: null,
        nationality: null,
        message: "No Self credential found for this address"
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        address,
        verified: false,
        credentialType,
        expiresAt: null,
        nationality: null,
        message: `Self Protocol API returned error: HTTP ${response.status} - ${errorText || response.statusText}`
      };
    }

    const data: any = await response.json();
    return {
      address,
      verified: data.verified ?? false,
      credentialType,
      expiresAt: data.expiresAt || null,
      nationality: data.nationality || null,
      message: data.verified ? "Credential successfully verified" : "Credential is not verified or has expired"
    };
  } catch (error: any) {
    console.error("Error calling Self Protocol verification API:", error);
    return {
      address,
      verified: false,
      credentialType,
      expiresAt: null,
      nationality: null,
      message: `Failed to connect to Self Protocol API: ${error?.message || String(error)}`
    };
  }
}
