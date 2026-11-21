# MIGRATION MAP

Bảng đường dẫn cũ → mới (sinh tự động từ script di chuyển). Nội dung file chỉ đổi import, banner comment, `console.*` → `logger`.

| Đường dẫn cũ | Đường dẫn mới |
|---|---|
| `Emulate.tsx` | `EmulateView.tsx` |
| `EmulateModule.ts` | `emulate.module.ts` |
| `components/AgentPanel.tsx` | `agent/components/AgentPanel/AgentPanel.tsx` |
| `components/FooterBar.tsx` | `app/layout/FooterBar.tsx` |
| `components/TargetListPanel/LaunchTargetModal/CliInfoPanel.tsx` | `features/targets/components/LaunchTargetModal/CliInfoPanel.tsx` |
| `components/TargetListPanel/LaunchTargetModal/MethodPanel.tsx` | `features/targets/components/LaunchTargetModal/MethodPanel.tsx` |
| `components/TargetListPanel/LaunchTargetModal/MobileInfoPanel.tsx` | `features/targets/components/LaunchTargetModal/MobileInfoPanel.tsx` |
| `components/TargetListPanel/LaunchTargetModal/ProfilePicker.tsx` | `features/targets/components/LaunchTargetModal/ProfilePicker.tsx` |
| `components/TargetListPanel/LaunchTargetModal/TargetPanel.tsx` | `features/targets/components/LaunchTargetModal/TargetPanel.tsx` |
| `components/TargetListPanel/LaunchTargetModal/index.tsx` | `features/targets/components/LaunchTargetModal/LaunchTargetModal.tsx` |
| `components/TargetListPanel/MobileDeviceCard.tsx` | `features/targets/components/TargetListPanel/MobileDeviceCard.tsx` |
| `components/TargetListPanel/TargetCard.tsx` | `features/targets/components/TargetListPanel/TargetCard.tsx` |
| `components/TargetListPanel/TargetModal.tsx` | `features/targets/components/TargetListPanel/TargetModal.tsx` |
| `components/TargetListPanel/index.tsx` | `features/targets/components/TargetListPanel/TargetListPanel.tsx` |
| `components/WorkspacePanel/Fuzzer/RequestList.tsx` | `features/fuzzer/components/RequestList.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/RequestBar.tsx` | `features/fuzzer/components/RequestPanel/RequestBar.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/TabContent/BodyTab.tsx` | `features/fuzzer/components/RequestPanel/tabs/BodyTab.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/TabContent/HeaderTab.tsx` | `features/fuzzer/components/RequestPanel/tabs/HeaderTab.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/TabContent/HistoryTab.tsx` | `features/fuzzer/components/RequestPanel/tabs/HistoryTab.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/TabContent/ParamTab.tsx` | `features/fuzzer/components/RequestPanel/tabs/ParamTab.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/TabContent/PayloadTab.tsx` | `features/fuzzer/components/RequestPanel/tabs/PayloadTab.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/index.tsx` | `features/fuzzer/components/RequestPanel/RequestPanel.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/modal/PayloadPreviewModal.tsx` | `features/fuzzer/components/RequestPanel/modals/PayloadPreviewModal.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/modal/PayloadValueModal.tsx` | `features/fuzzer/components/RequestPanel/modals/PayloadValueModal.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/modal/ProgressModal.tsx` | `features/fuzzer/components/RequestPanel/modals/ProgressModal.tsx` |
| `components/WorkspacePanel/Fuzzer/WorkspacePanel/RequestPanel/modal/ResultsModal.tsx` | `features/fuzzer/components/RequestPanel/modals/ResultsModal.tsx` |
| `components/WorkspacePanel/Fuzzer/index.tsx` | `features/fuzzer/components/Fuzzer.tsx` |
| `components/WorkspacePanel/Home/FilterPanel.tsx` | `features/traffic/components/FilterPanel.tsx` |
| `components/WorkspacePanel/Home/Home.tsx` | `features/traffic/components/Home.tsx` |
| `components/WorkspacePanel/Home/RequestDetail/Body.tsx` | `features/traffic/components/RequestDetail/Body.tsx` |
| `components/WorkspacePanel/Home/RequestDetail/Headers.tsx` | `features/traffic/components/RequestDetail/Headers.tsx` |
| `components/WorkspacePanel/Home/RequestDetail/Initiator.tsx` | `features/traffic/components/RequestDetail/Initiator.tsx` |
| `components/WorkspacePanel/Home/RequestDetail/Network.tsx` | `features/traffic/components/RequestDetail/Network.tsx` |
| `components/WorkspacePanel/Home/RequestTable.tsx` | `features/traffic/components/RequestTable.tsx` |
| `components/WorkspacePanel/Home/WebSocketUI.tsx` | `features/traffic/components/WebSocketUI.tsx` |
| `components/WorkspacePanel/Log/index.tsx` | `features/logs/components/Log.tsx` |
| `components/WorkspacePanel/Report/ReportCard.tsx` | `features/reports/components/ReportCard.tsx` |
| `components/WorkspacePanel/Report/ReportListPanel.tsx` | `features/reports/components/ReportListPanel.tsx` |
| `components/WorkspacePanel/Report/ReportViewPanel.tsx` | `features/reports/components/ReportViewPanel.tsx` |
| `components/WorkspacePanel/Report/index.tsx` | `features/reports/components/Report.tsx` |
| `components/WorkspacePanel/Resources/ResourceList.tsx` | `features/resources/components/ResourceList.tsx` |
| `components/WorkspacePanel/Resources/ResourcePreview.tsx` | `features/resources/components/ResourcePreview.tsx` |
| `components/WorkspacePanel/Resources/index.tsx` | `features/resources/components/Resources.tsx` |
| `components/WorkspacePanel/Source/FileContentSection.tsx` | `features/sources/components/FileContentSection.tsx` |
| `components/WorkspacePanel/Source/FileExplorePanel.tsx` | `features/sources/components/FileExplorePanel.tsx` |
| `components/WorkspacePanel/Source/index.tsx` | `features/sources/components/Source.tsx` |
| `components/WorkspacePanel/index.tsx` | `app/layout/WorkspacePanel.tsx` |
| `constants/defaults.ts` | `shared/constants/defaults.constants.ts` |
| `constants/methods.ts` | `shared/constants/methods.constants.ts` |
| `constants/platforms.ts` | `shared/constants/platforms.constants.ts` |
| `constants/resource.ts` | `shared/constants/resource.constants.ts` |
| `constants/status.ts` | `shared/constants/status.constants.ts` |
| `constants/tag-registry.ts` | `agent/tag-registry.ts` |
| `constants/tools.ts` | `shared/constants/tools.constants.ts` |
| `dto/emulate.dto.ts` | `shared/types/emulate.types.ts` |
| `executors/ApplyFilterExecutor.ts` | `agent/tools/apply-filter/apply-filter.executor.ts` |
| `executors/BrowserControlExecutor.ts` | `agent/tools/browser/browser.executor.ts` |
| `executors/CreateAgentExecutor.ts` | `agent/tools/create-agent/create-agent.executor.ts` |
| `executors/CreateReportExecutor.ts` | `agent/tools/create-report/create-report.executor.ts` |
| `executors/DeleteAgentExecutor.ts` | `agent/tools/delete-agent/delete-agent.executor.ts` |
| `executors/DeleteFuzzerExecutor.ts` | `agent/tools/delete-fuzzer/delete-fuzzer.executor.ts` |
| `executors/GetFuzzerDetailExecutor.ts` | `agent/tools/get-fuzzer-detail/get-fuzzer-detail.executor.ts` |
| `executors/GetHttpsDetailExecutor.ts` | `agent/tools/get-https-detail/get-https-detail.executor.ts` |
| `executors/GetResourceContentExecutor.ts` | `agent/tools/get-resource-content/get-resource-content.executor.ts` |
| `executors/GetSourceDetailExecutor.ts` | `agent/tools/get-source-detail/get-source-detail.executor.ts` |
| `executors/ListAgentsExecutor.ts` | `agent/tools/list-agents/list-agents.executor.ts` |
| `executors/ListFuzzersExecutor.ts` | `agent/tools/list-fuzzers/list-fuzzers.executor.ts` |
| `executors/ListHostsExecutor.ts` | `agent/tools/list-hosts/list-hosts.executor.ts` |
| `executors/ListHttpsExecutor.ts` | `agent/tools/list-https/list-https.executor.ts` |
| `executors/ListReportsExecutor.ts` | `agent/tools/list-reports/list-reports.executor.ts` |
| `executors/ListResourcesExecutor.ts` | `agent/tools/list-resources/list-resources.executor.ts` |
| `executors/ListSourcesExecutor.ts` | `agent/tools/list-sources/list-sources.executor.ts` |
| `executors/ReadReportExecutor.ts` | `agent/tools/read-report/read-report.executor.ts` |
| `executors/RunFuzzerExecutor.ts` | `agent/tools/run-fuzzer/run-fuzzer.executor.ts` |
| `executors/SendMessageExecutor.ts` | `agent/tools/send-message/send-message.executor.ts` |
| `executors/SendToFuzzerExecutor.ts` | `agent/tools/send-to-fuzzer/send-to-fuzzer.executor.ts` |
| `executors/UpdateFuzzerContentExecutor.ts` | `agent/tools/update-fuzzer-content/update-fuzzer-content.executor.ts` |
| `executors/UpdateReportExecutor.ts` | `agent/tools/update-report/update-report.executor.ts` |
| `handler/UpdateFuzzerContentHandler.ts` | `agent/tools/update-fuzzer-content/update-fuzzer-content.handler.ts` |
| `hooks/useFuzzerPersistence.ts` | `features/fuzzer/hooks/useFuzzerPersistence.ts` |
| `hooks/useHealthCheck.ts` | `app/hooks/useHealthCheck.ts` |
| `hooks/useNetworkBuffer.ts` | `features/traffic/hooks/useNetworkBuffer.ts` |
| `hooks/useNetworkEvents.ts` | `features/traffic/hooks/useNetworkEvents.ts` |
| `hooks/useRequestFilter.ts` | `features/traffic/hooks/useRequestFilter.ts` |
| `hooks/useTargetData.ts` | `features/targets/hooks/useTargetData.ts` |
| `parsers/ApplyFilterParser.ts` | `agent/tools/apply-filter/apply-filter.parser.ts` |
| `parsers/BrowserToolParser.ts` | `agent/tools/browser/browser.parser.ts` |
| `parsers/CreateAgentParser.ts` | `agent/tools/create-agent/create-agent.parser.ts` |
| `parsers/CreateReportParser.ts` | `agent/tools/create-report/create-report.parser.ts` |
| `parsers/DeleteAgentParser.ts` | `agent/tools/delete-agent/delete-agent.parser.ts` |
| `parsers/DeleteFuzzerParser.ts` | `agent/tools/delete-fuzzer/delete-fuzzer.parser.ts` |
| `parsers/GetFuzzerDetailParser.ts` | `agent/tools/get-fuzzer-detail/get-fuzzer-detail.parser.ts` |
| `parsers/GetHttpsDetailParser.ts` | `agent/tools/get-https-detail/get-https-detail.parser.ts` |
| `parsers/GetResourceContentParser.ts` | `agent/tools/get-resource-content/get-resource-content.parser.ts` |
| `parsers/GetSourceDetailParser.ts` | `agent/tools/get-source-detail/get-source-detail.parser.ts` |
| `parsers/ListAgentsParser.ts` | `agent/tools/list-agents/list-agents.parser.ts` |
| `parsers/ListFuzzersParser.ts` | `agent/tools/list-fuzzers/list-fuzzers.parser.ts` |
| `parsers/ListHostsParser.ts` | `agent/tools/list-hosts/list-hosts.parser.ts` |
| `parsers/ListHttpsParser.ts` | `agent/tools/list-https/list-https.parser.ts` |
| `parsers/ListReportsParser.ts` | `agent/tools/list-reports/list-reports.parser.ts` |
| `parsers/ListResourcesParser.ts` | `agent/tools/list-resources/list-resources.parser.ts` |
| `parsers/ListSourcesParser.ts` | `agent/tools/list-sources/list-sources.parser.ts` |
| `parsers/ReadReportParser.ts` | `agent/tools/read-report/read-report.parser.ts` |
| `parsers/RunFuzzerParser.ts` | `agent/tools/run-fuzzer/run-fuzzer.parser.ts` |
| `parsers/SendMessageParser.ts` | `agent/tools/send-message/send-message.parser.ts` |
| `parsers/SendToFuzzerParser.ts` | `agent/tools/send-to-fuzzer/send-to-fuzzer.parser.ts` |
| `parsers/UpdateFuzzerContentParser.ts` | `agent/tools/update-fuzzer-content/update-fuzzer-content.parser.ts` |
| `parsers/UpdateReportParser.ts` | `agent/tools/update-report/update-report.parser.ts` |
| `prompts/AGENTS.md` | `agent/prompts/AGENTS.md` |
| `prompts/analyzer/config.ts` | `agent/prompts/analyzer/config.ts` |
| `prompts/analyzer/constraints.ts` | `agent/prompts/analyzer/constraints.ts` |
| `prompts/analyzer/examples.ts` | `agent/prompts/analyzer/examples.ts` |
| `prompts/analyzer/filter-context.ts` | `agent/prompts/analyzer/filter-context.ts` |
| `prompts/analyzer/identity.ts` | `agent/prompts/analyzer/identity.ts` |
| `prompts/analyzer/index.ts` | `agent/prompts/analyzer/index.ts` |
| `prompts/analyzer/messaging.ts` | `agent/prompts/analyzer/messaging.ts` |
| `prompts/analyzer/system-context.ts` | `agent/prompts/analyzer/system-context.ts` |
| `prompts/analyzer/tool-validation.ts` | `agent/prompts/analyzer/tool-validation.ts` |
| `prompts/analyzer/tools-reference.ts` | `agent/prompts/analyzer/tools-reference.ts` |
| `prompts/analyzer/traffic-context.ts` | `agent/prompts/analyzer/traffic-context.ts` |
| `prompts/analyzer/types.ts` | `agent/prompts/analyzer/types.ts` |
| `prompts/analyzer/workflow.ts` | `agent/prompts/analyzer/workflow.ts` |
| `prompts/browser-control/config.ts` | `agent/prompts/browser-control/config.ts` |
| `prompts/browser-control/constraints.ts` | `agent/prompts/browser-control/constraints.ts` |
| `prompts/browser-control/example.ts` | `agent/prompts/browser-control/example.ts` |
| `prompts/browser-control/identity.ts` | `agent/prompts/browser-control/identity.ts` |
| `prompts/browser-control/index.ts` | `agent/prompts/browser-control/index.ts` |
| `prompts/browser-control/messaging.ts` | `agent/prompts/browser-control/messaging.ts` |
| `prompts/browser-control/system-context.ts` | `agent/prompts/browser-control/system-context.ts` |
| `prompts/browser-control/tool-validation.ts` | `agent/prompts/browser-control/tool-validation.ts` |
| `prompts/browser-control/tools-reference.ts` | `agent/prompts/browser-control/tools-reference.ts` |
| `prompts/browser-control/types.ts` | `agent/prompts/browser-control/types.ts` |
| `prompts/browser-control/workflow.ts` | `agent/prompts/browser-control/workflow.ts` |
| `prompts/local-operator/config.ts` | `agent/prompts/local-operator/config.ts` |
| `prompts/local-operator/constraints.ts` | `agent/prompts/local-operator/constraints.ts` |
| `prompts/local-operator/example.ts` | `agent/prompts/local-operator/example.ts` |
| `prompts/local-operator/identity.ts` | `agent/prompts/local-operator/identity.ts` |
| `prompts/local-operator/index.ts` | `agent/prompts/local-operator/index.ts` |
| `prompts/local-operator/messaging.ts` | `agent/prompts/local-operator/messaging.ts` |
| `prompts/local-operator/system-context.ts` | `agent/prompts/local-operator/system-context.ts` |
| `prompts/local-operator/tool-validation.ts` | `agent/prompts/local-operator/tool-validation.ts` |
| `prompts/local-operator/tools-reference.ts` | `agent/prompts/local-operator/tools-reference.ts` |
| `prompts/local-operator/types.ts` | `agent/prompts/local-operator/types.ts` |
| `prompts/local-operator/workflow.ts` | `agent/prompts/local-operator/workflow.ts` |
| `prompts/orchestrator/config.ts` | `agent/prompts/orchestrator/config.ts` |
| `prompts/orchestrator/constraints.ts` | `agent/prompts/orchestrator/constraints.ts` |
| `prompts/orchestrator/example.ts` | `agent/prompts/orchestrator/example.ts` |
| `prompts/orchestrator/identity.ts` | `agent/prompts/orchestrator/identity.ts` |
| `prompts/orchestrator/index.ts` | `agent/prompts/orchestrator/index.ts` |
| `prompts/orchestrator/system-context.ts` | `agent/prompts/orchestrator/system-context.ts` |
| `prompts/orchestrator/tool-validation.ts` | `agent/prompts/orchestrator/tool-validation.ts` |
| `prompts/orchestrator/tools-reference.ts` | `agent/prompts/orchestrator/tools-reference.ts` |
| `prompts/orchestrator/types.ts` | `agent/prompts/orchestrator/types.ts` |
| `prompts/orchestrator/workflow.ts` | `agent/prompts/orchestrator/workflow.ts` |
| `prompts/planner/config.ts` | `agent/prompts/planner/config.ts` |
| `prompts/planner/constraints.ts` | `agent/prompts/planner/constraints.ts` |
| `prompts/planner/example.ts` | `agent/prompts/planner/example.ts` |
| `prompts/planner/identity.ts` | `agent/prompts/planner/identity.ts` |
| `prompts/planner/index.ts` | `agent/prompts/planner/index.ts` |
| `prompts/planner/messaging.ts` | `agent/prompts/planner/messaging.ts` |
| `prompts/planner/system-context.ts` | `agent/prompts/planner/system-context.ts` |
| `prompts/planner/tool-validation.ts` | `agent/prompts/planner/tool-validation.ts` |
| `prompts/planner/tools-reference.ts` | `agent/prompts/planner/tools-reference.ts` |
| `prompts/planner/types.ts` | `agent/prompts/planner/types.ts` |
| `prompts/planner/workflow.ts` | `agent/prompts/planner/workflow.ts` |
| `renderers/ApplyFilterRenderer.tsx` | `agent/tools/apply-filter/apply-filter.renderer.tsx` |
| `renderers/CreateAgentRenderer.tsx` | `agent/tools/create-agent/create-agent.renderer.tsx` |
| `renderers/CreateReportRenderer.tsx` | `agent/tools/create-report/create-report.renderer.tsx` |
| `renderers/DeleteAgentRenderer.tsx` | `agent/tools/delete-agent/delete-agent.renderer.tsx` |
| `renderers/DeleteFuzzerRenderer.tsx` | `agent/tools/delete-fuzzer/delete-fuzzer.renderer.tsx` |
| `renderers/GetFuzzerDetailRenderer.tsx` | `agent/tools/get-fuzzer-detail/get-fuzzer-detail.renderer.tsx` |
| `renderers/GetHttpsDetailRenderer.tsx` | `agent/tools/get-https-detail/get-https-detail.renderer.tsx` |
| `renderers/GetResourceContentRenderer.tsx` | `agent/tools/get-resource-content/get-resource-content.renderer.tsx` |
| `renderers/GetSourceDetailRenderer.tsx` | `agent/tools/get-source-detail/get-source-detail.renderer.tsx` |
| `renderers/ListAgentsRenderer.tsx` | `agent/tools/list-agents/list-agents.renderer.tsx` |
| `renderers/ListFuzzersRenderer.tsx` | `agent/tools/list-fuzzers/list-fuzzers.renderer.tsx` |
| `renderers/ListHostsRenderer.tsx` | `agent/tools/list-hosts/list-hosts.renderer.tsx` |
| `renderers/ListHttpsRenderer.tsx` | `agent/tools/list-https/list-https.renderer.tsx` |
| `renderers/ListReportsRenderer.tsx` | `agent/tools/list-reports/list-reports.renderer.tsx` |
| `renderers/ListResourcesRenderer.tsx` | `agent/tools/list-resources/list-resources.renderer.tsx` |
| `renderers/ListSourcesRenderer.tsx` | `agent/tools/list-sources/list-sources.renderer.tsx` |
| `renderers/ReadReportRenderer.tsx` | `agent/tools/read-report/read-report.renderer.tsx` |
| `renderers/RunFuzzerRenderer.tsx` | `agent/tools/run-fuzzer/run-fuzzer.renderer.tsx` |
| `renderers/SendMessageRenderer.tsx` | `agent/tools/send-message/send-message.renderer.tsx` |
| `renderers/SendToFuzzerRenderer.tsx` | `agent/tools/send-to-fuzzer/send-to-fuzzer.renderer.tsx` |
| `renderers/UpdateFuzzerContentRenderer.tsx` | `agent/tools/update-fuzzer-content/update-fuzzer-content.renderer.tsx` |
| `renderers/UpdateReportRenderer.tsx` | `agent/tools/update-report/update-report.renderer.tsx` |
| `services/emulate-api.service.ts` | `shared/api/emulate.api.ts` |
| `services/emulate-base-url.ts` | `shared/api/emulate-base-url.ts` |
| `services/emulate-context.service.ts` | `agent/services/emulate-context.service.ts` |
| `services/logcat.service.ts` | `features/logs/services/logcat.service.ts` |
| `services/runtime-api.service.ts` | `shared/api/runtime.api.ts` |
| `services/runtime-ws-bridge.ts` | `shared/api/runtime-ws-bridge.ts` |
| `services/secure-storage.service.ts` | `shared/services/secure-storage.service.ts` |
| `stores/filterStore.ts` | `features/traffic/stores/filter.store.ts` |
| `stores/mobileConnectionStore.ts` | `features/targets/stores/mobile-connection.store.ts` |
| `stores/networkStore.ts` | `features/traffic/stores/network.store.ts` |
| `stores/reportStore.ts` | `features/reports/stores/report.store.ts` |
| `stores/timerStore.ts` | `shared/stores/timer.store.ts` |
| `stores/useEmulateWorkflowStore.ts` | `agent/stores/emulate-workflow.store.ts` |
| `stores/websocketStore.ts` | `features/traffic/stores/websocket.store.ts` |
| `types/apps.ts` | `shared/types/apps.types.ts` |
| `types/filter.types.ts` | `shared/types/filter.types.ts` |
| `types/fuzzer.types.ts` | `shared/types/fuzzer.types.ts` |
| `types/inspector.ts` | `shared/types/inspector.types.ts` |
| `types/log.types.ts` | `shared/types/log.types.ts` |
| `types/network.ts` | `shared/types/network.types.ts` |
| `types/resource.types.ts` | `shared/types/resource.types.ts` |
| `types/target.types.ts` | `shared/types/target.types.ts` |
| `utils/fuzzer-resolver.util.ts` | `shared/utils/fuzzer-resolver.util.ts` |
| `utils/network-event-parser.util.ts` | `shared/utils/network-event-parser.util.ts` |
| `utils/prettify.ts` | `shared/utils/prettify.util.ts` |
| `utils/report-resolver.util.ts` | `shared/utils/report-resolver.util.ts` |
| `utils/request-classifier.util.ts` | `shared/utils/request-classifier.util.ts` |
| `utils/resource-items.util.ts` | `shared/utils/resource-items.util.ts` |
| `utils/source-files.util.ts` | `shared/utils/source-files.util.ts` |
| `utils/source-tree.util.ts` | `shared/utils/source-tree.util.ts` |
| `utils/tool-result.util.ts` | `shared/utils/tool-result.util.ts` |
| `utils/wasm-detector.util.ts` | `shared/utils/wasm-detector.util.ts` |

## File bị xóa

| File | Lý do |
|---|---|
| `utils/index.ts` | Barrel thiếu 8/11 util và không ai import |
| `constants/index.ts` | Barrel thiếu `status`, trộn cả tag-registry; không ai import |
| `workers/`, `components/EmulatePanel/`, `components/WorkspacePanel/Device/` | Thư mục rỗng |

## File mới

| File | Vai trò |
|---|---|
| `index.ts` | Public API của module |
| `Emulate.tsx`, `EmulateModule.ts` | Shim re-export để nơi import cũ ngoài module không vỡ |
| `agent/tools/registry.ts`, `agent/tools/tool.types.ts` | Gom tool tự động, kiểu `EmulateTool` |
| `agent/tools/<tool>/index.ts` | Khai báo một tool (name, execute, parse) |
| `shared/utils/logger.util.ts` | Logger duy nhất, thay 105 `console.*` |
| `features/traffic/constants/filter.constants.ts` | `initialFilterState` tách khỏi component |
| `features/*/index.ts`, `agent/index.ts` | Public API từng feature |
