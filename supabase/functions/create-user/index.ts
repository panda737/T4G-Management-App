import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a client with the caller's JWT to verify their role
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the caller is an active admin
    const { data: callerProfile, error: profileError } = await callerClient
      .from("user_profiles")
      .select("role, is_active")
      .eq("auth_user_id", (await callerClient.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    if (profileError || !callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the request body
    const { email, password, display_name, role } = await req.json();

    if (!email || !password || !display_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, password, display_name, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ["admin", "management", "stock_controller", "production", "operator", "viewer", "customer"];
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to create the auth user
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Failed to create user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the caller's user ID for the created_by field
    const { data: callerUser } = await callerClient.auth.getUser();

    // Create the user profile
    const { error: profileInsertError } = await adminClient
      .from("user_profiles")
      .insert({
        auth_user_id: newUser.user.id,
        display_name,
        role,
        is_active: true,
        created_by: callerUser?.user?.id ?? null,
      });

    if (profileInsertError) {
      // Rollback: delete the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: "Failed to create user profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: newUser.user.email,
        display_name,
        role,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-user unhandled error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
