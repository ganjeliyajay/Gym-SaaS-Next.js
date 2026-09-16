"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ProductForm from "../../../../../components/products/Product-form"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type ProductFormData = {
  name: string
  description: string
  paymentType: "recurring" | "one-time"
  price: string
  billingInterval: string
  accessType: "full" | "visits" | "none"
  visitLimit: string
  classAccess: "all" | "selected" | "none"
  selectedClasses: string[]
  durationType: "ongoing" | "limited" | "periodic"
  durationValue: string
  durationUnit: string
  discountEnabled: boolean
  discountType: "percentage" | "fixed"
  discountValue: string
  active: boolean
}

export default function EditProductPage() {
  const toast = useToast()
  const params = useParams()
  const router = useRouter()

  const productId = Array.isArray(params.id) ? params.id[0] : params.id

  const [product, setProduct] = useState<ProductFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!productId) {
      toast.error("Product ID is missing.")
      setError("Product ID is missing.")
      setLoading(false)
      return
    }

    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      setError("")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym profile could not be found.")
      }

      const { data, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("gym_id", profile.gym_id)
        .single()

      if (productError) {
        throw new Error(productError.message)
      }

      if (!data) {
        throw new Error("Product not found.")
      }

      setProduct({
        name: data.name ?? "",
        description: data.description ?? "",
        paymentType: data.payment_type ?? "recurring",
        price: String(data.price ?? ""),
        billingInterval: data.billing_interval ?? "monthly",
        accessType: data.access_type ?? "full",
        visitLimit: String(data.visit_limit ?? "0"),
        classAccess: data.class_access ?? "all",
        selectedClasses: Array.isArray(data.selected_classes)
          ? data.selected_classes
          : [],
        durationType: data.duration_type ?? "ongoing",
        durationValue: String(data.duration_value ?? ""),
        durationUnit: data.duration_unit ?? "days",
        discountEnabled: Boolean(data.discount_enabled),
        discountType: data.discount_type ?? "percentage",
        discountValue:
          data.discount_value === null || data.discount_value === undefined
            ? ""
            : String(data.discount_value),
        active: Boolean(data.active),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load product."
      toast.error(msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
              <p className="mt-3 text-sm text-gray-500">Loading product...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900">
              Product not found
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {error || "This product could not be found."}
            </p>

            <button
              onClick={() => router.push("/products")}
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
            >
              Back to Products
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <ProductForm mode="edit" initialData={product} />
}
