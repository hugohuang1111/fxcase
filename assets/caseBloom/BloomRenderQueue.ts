
// import { RecyclePool } from '../memop';
// import { CachedArray } from '../memop/cached-array';
// import { IRenderObject, IRenderPass, IRenderQueueDesc, SetIndex } from './define';
// import { PipelineStateManager } from './pipeline-state-manager';
// import { RenderPass, Device, CommandBuffer } from '../gfx';
// import { PassPool, PassView, DSPool, SubModelView, SubModelPool, ShaderPool, PassHandle, ShaderHandle } from '../renderer/core/memory-pools';
// import { RenderQueueDesc, RenderQueueSortMode } from './pipeline-serialization';
// import { getPhaseID } from './pass-phase';

import { gfx, memop, pipeline, PipelineStateManager, renderer } from "cc";

/**
 * @en Comparison sorting function. Opaque objects are sorted by priority -> depth front to back -> shader ID.
 * @zh 比较排序函数。不透明对象按优先级 -> 深度由前向后 -> Shader ID 顺序排序。
 */
export function opaqueCompareFn (a: pipeline.IRenderPass, b: pipeline.IRenderPass) {
    return (a.hash - b.hash) || (a.depth - b.depth) || (a.shaderId - b.shaderId);
}

/**
 * @en Comparison sorting function. Transparent objects are sorted by priority -> depth back to front -> shader ID.
 * @zh 比较排序函数。半透明对象按优先级 -> 深度由后向前 -> Shader ID 顺序排序。
 */
export function transparentCompareFn (a: pipeline.IRenderPass, b: pipeline.IRenderPass) {
    return (a.hash - b.hash) || (b.depth - a.depth) || (a.shaderId - b.shaderId);
}

/**
 * @en The render queue. It manages a GFX [[RenderPass]] queue which will be executed by the [[RenderStage]].
 * @zh 渲染队列。它管理一个 GFX [[RenderPass]] 队列，队列中的渲染过程会被 [[RenderStage]] 所执行。
 */
export class BloomRenderQueue {
    /**
     * @en A cached array of render passes
     * @zh 基于缓存数组的渲染过程队列。
     */
    public queue: memop.CachedArray<pipeline.IRenderPass>;

    private _passDesc: pipeline.IRenderQueueDesc;
    private _passPool: memop.RecyclePool<pipeline.IRenderPass>;

    /**
     * @en Construct a RenderQueue with render queue descriptor
     * @zh 利用渲染队列描述来构造一个 RenderQueue。
     * @param desc Render queue descriptor
     */
    constructor (desc: pipeline.IRenderQueueDesc) {
        this._passDesc = desc;
        this._passPool = new memop.RecyclePool(() => ({
            hash: 0,
            depth: 0,
            shaderId: 0,
            subModel: null!,
            passIdx: 0,
        }), 64);
        this.queue = new memop.CachedArray(64, this._passDesc.sortFunc);
    }

    /**
     * @en Clear the render queue
     * @zh 清空渲染队列。
     */
    public clear () {
        this.queue.clear();
        this._passPool.reset();
    }

    /**
     * @en Insert a render pass into the queue
     * @zh 插入渲染过程。
     * @param renderObj The render object of the pass
     * @param modelIdx The model id
     * @param passIdx The pass id
     * @returns Whether the new render pass is successfully added
     */
    public insertRenderPass (renderObj: pipeline.IRenderObject, subModelIdx: number, passIdx: number): boolean {
        const subModel = renderObj.model.subModels[subModelIdx];
        const hPass = renderer.SubModelPool.get(subModel.handle, renderer.SubModelView.PASS_0 + passIdx) as renderer.PassHandle;
        const isTransparent = subModel.passes[passIdx].blendState.targets[0].blend;
        if (isTransparent !== this._passDesc.isTransparent || !(renderer.PassPool.get(hPass, renderer.PassView.PHASE) & this._passDesc.phases)) {
            return false;
        }
        const hash = (0 << 30) | renderer.PassPool.get(hPass, renderer.PassView.PRIORITY) << 16 | subModel.priority << 8 | passIdx;
        const rp = this._passPool.add();
        rp.hash = hash;
        rp.depth = renderObj.depth || 0;
        rp.shaderId = renderer.SubModelPool.get(subModel.handle, renderer.SubModelView.SHADER_0 + passIdx) as number;
        rp.subModel = subModel;
        rp.passIdx = passIdx;
        this.queue.push(rp);
        return true;
    }

    /**
     * @en Sort the current queue
     * @zh 排序渲染队列。
     */
    public sort () {
        this.queue.sort();
    }

    public recordCommandBuffer (device: gfx.Device, renderPass: gfx.RenderPass, cmdBuff: gfx.CommandBuffer) {
        for (let i = 0; i < this.queue.length; ++i) {
            const { subModel, passIdx } = this.queue.array[i];
            const { inputAssembler, handle: hSubModel } = subModel;
            const pass = subModel.passes[passIdx];
            const shader = renderer.ShaderPool.get(renderer.SubModelPool.get(hSubModel, renderer.SubModelView.SHADER_0 + passIdx) as renderer.ShaderHandle);
            const pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindDescriptorSet(pipeline.SetIndex.MATERIAL, pass.descriptorSet);
            cmdBuff.bindDescriptorSet(pipeline.SetIndex.LOCAL, subModel.descriptorSet);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
        }
    }
}

export function bloomRenderQueueClearFunc (rq: BloomRenderQueue) {
    rq.clear();
}
