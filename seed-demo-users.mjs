import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing")
}

if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is missing")
}

const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

const gymId = "f14b6243-df3c-4e5c-a6d6-39b8d3c3a143"

const demoUsers = [
    {
        email: "manager@test.com",
        password: "123456",
        fullName: "Demo Manager",
        role: "manager",
    },
    {
        email: "trainer@test.com",
        password: "123456",
        fullName: "Demo Trainer",
        role: "trainer",
    },
    {
        email: "member@test.com",
        password: "123456",
        fullName: "Demo Member",
        role: "member",
    },
]

async function main() {
    for (const demoUser of demoUsers) {
        console.log(`\nCreating ${demoUser.role}: ${demoUser.email}`)

        // Check whether Auth user already exists
        let existingUser = null

        let page = 1
        const perPage = 1000

        while (!existingUser) {
            const { data, error } =
                await supabase.auth.admin.listUsers({
                    page,
                    perPage,
                })

            if (error) {
                throw error
            }

            existingUser = data.users.find(
                (user) =>
                    user.email?.toLowerCase() ===
                    demoUser.email.toLowerCase()
            )

            if (
                data.users.length < perPage ||
                existingUser
            ) {
                break
            }

            page++
        }

        let userId

        if (existingUser) {
            console.log("Auth user already exists:", existingUser.id)

            // Make sure the password works
            const { error: updateAuthError } =
                await supabase.auth.admin.updateUserById(
                    existingUser.id,
                    {
                        password: demoUser.password,
                        email_confirm: true,
                        user_metadata: {
                            full_name: demoUser.fullName,
                            role: demoUser.role,
                        },
                    }
                )

            if (updateAuthError) {
                throw updateAuthError
            }

            userId = existingUser.id
        } else {
            const { data, error } =
                await supabase.auth.admin.createUser({
                    email: demoUser.email,
                    password: demoUser.password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: demoUser.fullName,
                        role: demoUser.role,
                    },
                })

            if (error) {
                throw error
            }

            if (!data.user) {
                throw new Error(
                    `User creation failed for ${demoUser.email}`
                )
            }

            userId = data.user.id

            console.log("Auth user created:", userId)
        }

        // Create/update application profile
        const { error: profileError } =
            await supabase
                .from("profiles")
                .upsert(
                    {
                        id: userId,
                        gym_id: gymId,
                        full_name: demoUser.fullName,
                        email: demoUser.email,
                        role: demoUser.role,
                    },
                    {
                        onConflict: "id",
                    }
                )

        if (profileError) {
            throw profileError
        }

        console.log(
            `✓ ${demoUser.role} ready`
        )
    }

    console.log("\n================================")
    console.log("DEMO USERS READY")
    console.log("================================")
    console.log("Manager: manager@test.com")
    console.log("Trainer: trainer@test.com")
    console.log("Member : member@test.com")
    console.log("Password: 123456")
    console.log("Gym ID:", gymId)
}

main().catch((error) => {
    console.error("\n❌ Seed failed:")
    console.error(error)
    process.exit(1)
})