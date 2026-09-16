import ClassForm from "../../../../../../components/calendar/class-form"

type EditClassPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditClassPage({
  params,
}: EditClassPageProps) {
  const { id } = await params

  return <ClassForm mode="edit" classId={id} />
}