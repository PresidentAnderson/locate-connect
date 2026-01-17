// Utilities
export { cn } from "./utils";

// Services
export { assessPriority, getPriorityDisplay } from "./services";

// Note: Supabase clients should be imported directly:
// - Client components: import { createClient } from "@/lib/supabase/client"
// - Server components: import { createClient } from "@/lib/supabase/server"
// - Middleware: import { updateSession } from "@/lib/supabase/middleware"
