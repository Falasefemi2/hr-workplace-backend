import * as Effect from "effect/Effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import * as XLSX from "xlsx"

const TEMPLATE_HEADERS = ["First name", "Last name", "Email", "Gender", "Country", "Phone number", "Monthly gross"]

export const onboardingTemplateRoute = HttpRouter.route(
  "GET",
  "/employees/onboarding/template",
  Effect.gen(function* () {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Employees")
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return HttpServerResponse.uint8Array(buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      headers: { "content-disposition": 'attachment; filename="employee-onboarding-template.xlsx"' },
    })
  }),
)
