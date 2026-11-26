import { clean, q, txt, until, set, bool, num } from '../_helpers';

/**
 * Scraper cho BrowserLeaks /webgl — https://browserleaks.com/webgl
 * 73 fields: User-Agent, WebGL support, fingerprint hashes, context info, debug renderer,
 * context attributes, vertex shader, transform feedback, rasterizer, fragment shader,
 * framebuffer, textures, uniform buffers, WebGL 2 extensions
 */
export async function scrapeBlWebgl(timeoutMs: number): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  
  try {
    await until(() => !!txt('#UNMASKED_RENDERER_WEBGL') || !!txt('#RENDERER'), timeoutMs);
    
    // Your Web Browser
    set(out, 'httpUserAgent', txt('#http-user-agent'));
    
    // WebGL Support Detection
    set(out, 'webglSupport', bool(txt('#webgl-support')));
    set(out, 'webgl2Support', bool(txt('#webgl2-support')));
    
    // WebGL Fingerprint
    set(out, 'webglReportHash', txt('#gl-report-hash'));
    set(out, 'webglImageHash', txt('#gl-image-hash'));
    
    // WebGL Context Info
    set(out, 'supportedContextNames', txt('#supported-context'));
    set(out, 'glVersion', txt('#VERSION'));
    set(out, 'shadingLanguageVersion', txt('#SHADING_LANGUAGE_VERSION'));
    set(out, 'vendor', txt('#VENDOR'));
    set(out, 'renderer', txt('#RENDERER'));
    
    // Debug Renderer Info
    set(out, 'unmaskedVendor', txt('#UNMASKED_VENDOR_WEBGL'));
    set(out, 'unmaskedRenderer', txt('#UNMASKED_RENDERER_WEBGL'));
    
    // Context Attributes
    set(out, 'alphaBuffer', bool(txt('#alpha')));
    set(out, 'depthBuffer', bool(txt('#depth')));
    set(out, 'stencilBuffer', bool(txt('#stencil')));
    set(out, 'desynchronized', bool(txt('#desynchronized')));
    set(out, 'antiAliasing', bool(txt('#antialias')));
    set(out, 'majorPerformanceCaveat', bool(txt('#failIfMajorPerformanceCaveat')));
    set(out, 'powerPreference', txt('#powerPreference'));
    set(out, 'preMultipliedAlpha', bool(txt('#premultipliedAlpha')));
    set(out, 'preserveDrawingBuffer', bool(txt('#preserveDrawingBuffer')));
    set(out, 'xrCompatible', bool(txt('#xrCompatible')));
    set(out, 'drawingBufferColorSpace', txt('#drawingBufferColorSpace'));
    set(out, 'unpackColorSpace', txt('#unpackColorSpace'));
    
    // Vertex Shader
    set(out, 'maxVertexAttribs', num(txt('#MAX_VERTEX_ATTRIBS')));
    set(out, 'maxVertexUniformVectors', num(txt('#MAX_VERTEX_UNIFORM_VECTORS')));
    set(out, 'maxVertexTextureImageUnits', num(txt('#MAX_VERTEX_TEXTURE_IMAGE_UNITS')));
    set(out, 'maxVaryingVectors', num(txt('#MAX_VARYING_VECTORS')));
    set(out, 'bestFloatPrecision', txt('#VERTEX_SHADER_best_float'));
    set(out, 'maxVertexUniformComponents', num(txt('#MAX_VERTEX_UNIFORM_COMPONENTS')));
    set(out, 'maxVertexUniformBlocks', num(txt('#MAX_VERTEX_UNIFORM_BLOCKS')));
    set(out, 'maxVertexOutputComponents', num(txt('#MAX_VERTEX_OUTPUT_COMPONENTS')));
    set(out, 'maxVaryingComponents', num(txt('#MAX_VARYING_COMPONENTS')));
    
    // Transform Feedback
    set(out, 'maxTransformFeedbackInterleavedComponents', num(txt('#MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS')));
    set(out, 'maxTransformFeedbackSeparateAttribs', num(txt('#MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS')));
    set(out, 'maxTransformFeedbackSeparateComponents', num(txt('#MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS')));
    
    // Rasterizer
    set(out, 'aliasedLineWidthRange', txt('#ALIASED_LINE_WIDTH_RANGE'));
    set(out, 'aliasedPointSizeRange', txt('#ALIASED_POINT_SIZE_RANGE'));
    
    // Fragment Shader
    set(out, 'maxFragmentUniformVectors', num(txt('#MAX_FRAGMENT_UNIFORM_VECTORS')));
    set(out, 'maxTextureImageUnits', num(txt('#MAX_TEXTURE_IMAGE_UNITS')));
    set(out, 'fragmentFloatIntPrecision', txt('#FRAGMENT_SHADER_float_int'));
    set(out, 'fragmentBestFloatPrecision', txt('#FRAGMENT_SHADER_best_float'));
    set(out, 'maxFragmentUniformComponents', num(txt('#MAX_FRAGMENT_UNIFORM_COMPONENTS')));
    set(out, 'maxFragmentUniformBlocks', num(txt('#MAX_FRAGMENT_UNIFORM_BLOCKS')));
    set(out, 'maxFragmentInputComponents', num(txt('#MAX_FRAGMENT_INPUT_COMPONENTS')));
    set(out, 'minProgramTexelOffset', num(txt('#MIN_PROGRAM_TEXEL_OFFSET')));
    set(out, 'maxProgramTexelOffset', num(txt('#MAX_PROGRAM_TEXEL_OFFSET')));
    
    // Framebuffer
    set(out, 'maxDrawBuffers', num(txt('#MAX_DRAW_BUFFERS')));
    set(out, 'maxColorAttachments', num(txt('#MAX_COLOR_ATTACHMENTS')));
    set(out, 'maxSamples', num(txt('#MAX_SAMPLES')));
    set(out, 'maxRenderBufferSize', num(txt('#MAX_RENDERBUFFER_SIZE')));
    set(out, 'maxViewportDimensions', txt('#MAX_VIEWPORT_DIMS'));
    set(out, 'redBits', num(txt('#RED_BITS')));
    set(out, 'greenBits', num(txt('#GREEN_BITS')));
    set(out, 'blueBits', num(txt('#BLUE_BITS')));
    set(out, 'alphaBits', num(txt('#ALPHA_BITS')));
    set(out, 'depthBits', num(txt('#DEPTH_BITS')));
    set(out, 'stencilBits', num(txt('#STENCIL_BITS')));
    
    // Textures
    set(out, 'maxTextureSize', num(txt('#MAX_TEXTURE_SIZE')));
    set(out, 'maxCubeMapTextureSize', num(txt('#MAX_CUBE_MAP_TEXTURE_SIZE')));
    set(out, 'maxCombinedTextureImageUnits', num(txt('#MAX_COMBINED_TEXTURE_IMAGE_UNITS')));
    set(out, 'maxAnisotropy', num(txt('#MAX_TEXTURE_MAX_ANISOTROPY_EXT')));
    set(out, 'max3dTextureSize', num(txt('#MAX_3D_TEXTURE_SIZE')));
    set(out, 'maxArrayTextureLayers', num(txt('#MAX_ARRAY_TEXTURE_LAYERS')));
    set(out, 'maxTextureLodBias', num(txt('#MAX_TEXTURE_LOD_BIAS')));
    
    // Uniform Buffers
    set(out, 'maxUniformBufferBindings', num(txt('#MAX_UNIFORM_BUFFER_BINDINGS')));
    set(out, 'maxUniformBlockSize', num(txt('#MAX_UNIFORM_BLOCK_SIZE')));
    set(out, 'uniformBufferOffsetAlignment', num(txt('#UNIFORM_BUFFER_OFFSET_ALIGNMENT')));
    set(out, 'maxCombinedUniformBlocks', num(txt('#MAX_COMBINED_UNIFORM_BLOCKS')));
    set(out, 'maxCombinedVertexUniformComponents', num(txt('#MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS')));
    set(out, 'maxCombinedFragmentUniformComponents', num(txt('#MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS')));
    
    // WebGL 2 Extensions
    const extList = txt('#webgl-extensions');
    if (extList) out.webgl2Extensions = extList.split('\n').map(s => clean(s)).filter(Boolean);
  } catch (e: any) {
    out.__error = String(e && e.message ? e.message : e);
  }
  
  return out;
}