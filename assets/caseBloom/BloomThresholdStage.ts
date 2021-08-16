
import { _decorator, Component, Node, ForwardStage, renderer, getPhaseID, gfx, pipeline, ForwardPipeline, ForwardFlow, CCLoader, find, Sprite, Size, UITransform, Material, RenderStage, PipelineStateManager } from 'cc';
import { Bloom } from './Bloom';
import { BloomBaseStage } from './BloomBaseStage';
import { BloomRenderQueue, bloomRenderQueueClearFunc, opaqueCompareFn, transparentCompareFn } from './BloomRenderQueue';
const { ccclass, property } = _decorator;

const colors: gfx.Color[] = [new gfx.Color(0, 0, 0, 1)];

const _samplerInfo = [
    gfx.Filter.LINEAR,
    gfx.Filter.LINEAR,
    gfx.Filter.NONE,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
];

const samplerHash = renderer.genSamplerHash(_samplerInfo);

class BloomRenderData {
    gbufferFrameBuffer: gfx.Framebuffer | null = null;
    gbufferRenderTargets: gfx.Texture[] = [];
    depthTex: gfx.Texture | null = null;
}

@ccclass('BloomThresholdStage')
export class BloomThresholdStage extends BloomBaseStage {
    constructor() {
        super();
        this._name = "BloomThresholdStage";
    }
}

