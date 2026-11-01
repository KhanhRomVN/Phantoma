/**
 * Regex pattern constants
 */

// Path detection patterns
export const ABSOLUTE_PATH_REGEX = /^(\/[^\s<>"'`]+|[A-Za-z]:\\[^\s<>"'`]+)/;
export const RELATIVE_PATH_WITH_FOLDERS_REGEX = /^[^\s<>"'`|*?:]+[\/\\][^\s<>"'`|*?:]+\.[a-zA-Z0-9]{1,10}$/;
export const FILENAME_REGEX = /^[^\s\/\\<>"'`]+\.[a-zA-Z0-9]{1,10}$/;

// User message parsing patterns
export const USER_MESSAGE_WRAPPER_REGEX = /## User Message\n<user-message>\n([\s\S]*?)\n<\/user-message>/;
export const USER_MESSAGE_TAG_REGEX = /^<user-message>\n?|\n?<\/user-message>[\s\S]*$/g;
export const CODE_FENCE_REGEX = /^```[\s\S]*?```$/;