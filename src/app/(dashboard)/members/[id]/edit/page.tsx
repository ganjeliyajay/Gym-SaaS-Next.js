"use client"

import MemberForm from "../../../../../components/members/member-form"
import { useParams } from "next/navigation"

export default function EditMemberPage() {
  const params = useParams()
  const memberId = params.id as string

  return <MemberForm mode="edit" memberId={memberId} />
}