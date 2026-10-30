import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Environment } from "src/config/environment";

@Injectable()
export class SupabaseService {
  public readonly client: SupabaseClient;

  constructor(
    private readonly configService: ConfigService<Environment, true>,
  ) {
    const supabaseURL = this.configService.get("SUPABASE_URL", { infer: true });
    const supabaseKey = this.configService.get("SUPABASE_SECRET_KEY", {
      infer: true,
    });

    if (!supabaseURL || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    this.client = createClient(supabaseURL, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
