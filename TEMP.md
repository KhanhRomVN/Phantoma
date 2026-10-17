src/renderer/src/components/RightPanel/Agent/feature/Chat/hooks/llm/useChatLLM.ts:
```
1. 'antiSystemPromptInjection' is declared but its value is never read. | 153 | antiSystemPromptInjection = false,
2. 'onMalformedTool' is declared but its value is never read. | 156 | onMalformedTool,
3. 'onConversationTitleChange' is declared but its value is never read. | 157 | onConversationTitleChange,
4. Cannot find name 'useRef'. | 161 | const conversationOverridesRef = useRef<ConversationOverrides | undefined>(
5. Cannot find name 'useRef'. | 164 | const prevSelectedTabIdRef = useRef<string | number | undefined>(
6. Cannot find name 'useRef'. | 180 | const onTurnCompleteRef = useRef(onTurnComplete);
7. Cannot redeclare block-scoped variable 'currentProviderId'. | 320 | const currentProviderId =
8. Cannot redeclare block-scoped variable 'currentProviderId'. | 495 | const currentProviderId = finalModel?.providerId ?? lastUsedModelRef.current?.providerId;
9. Block-scoped variable 'finalModel' used before its declaration. | 495 | const currentProviderId = finalModel?.providerId ?? lastUsedModelRef.current?.providerId;
10. Expected 1 arguments, but got 2. | 869 | parsed = parseAIResponse(contentToParse, currentToolFormat);
```
<-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=->