
import { _decorator, Component, systemEvent, SystemEvent, EventTouch, Touch, geometry, Camera, MeshRenderer, gfx, Vec3, find, Node, TERRAIN_HEIGHT_BASE } from 'cc';
import { DecalModel } from './DecalModel';
const { ccclass, property } = _decorator;
 
@ccclass('Main')
export class Main extends Component {

    @property(Camera)
    mainCamera: Camera | null = null;

    @property(MeshRenderer)
    mr: MeshRenderer | null = null;

    @property(Node)
    decalTemplate: Node | null = null;

    private decalRoot: Node | null = null;
    private _ray = new geometry.Ray();
    private modOpt: geometry.IRayModelOptions = {
        distance: Infinity,
        doubleSided: false,
        mode: geometry.ERaycastMode.ANY,
        subIndices: [],
        result: []
    };

    start () {
        // [3]
        this.decalRoot = find("decals")
    }

    // update (deltaTime: number) {
    //     // [4]
    // }

    onEnable () {
        systemEvent.on(SystemEvent.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onDisable () {
        systemEvent.off(SystemEvent.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onTouchStart (touch: Touch, event: EventTouch) {
        if (null == this.mainCamera) {
            console.log('main camera is not set');
            return;
        }
        if (null == this.mr) {
            console.log('mr is not set');
            return;
        }
        if (null == this.mr.mesh && null == this.mr.model) {
            console.log('mr mesh and model is all null');
            return;
        }
        if (null == this.decalTemplate) {
            console.log('decal template is not set');
            return;
        }

        const point = touch.getLocation();
        this.mainCamera.screenPointToRay(point.x, point.y, this._ray);

        if (this.modOpt.result) {
            this.modOpt.result.length = 0;
        }
        if (this.modOpt.subIndices) {
            this.modOpt.subIndices.length = 0;
        }
        let intersectCount = 0;
        if (this.mr.mesh) {
            intersectCount = geometry.intersect.rayMesh(this._ray, this.mr.mesh, this.modOpt);
        } else if (this.mr.model) {
            intersectCount = geometry.intersect.rayModel(this._ray, this.mr.model, this.modOpt);
        }
        if (intersectCount) {
            if (!this.modOpt.subIndices || !this.modOpt.result) {
                console.log(this.modOpt);
                return;
            }
            console.log('model touched');
            const rst = this.modOpt.result[0];
            let mesh = null;
            if (this.mr.mesh) {
                mesh = this.mr.mesh;
            } else if (this.mr.model) {
                mesh = this.mr.model.subModels[this.modOpt.subIndices[0]].subMesh.mesh;
            }

            console.log(this.modOpt);

            // const posArr = mesh?.readAttribute(subMod.subMesh.subMeshIdx!, gfx.AttributeName.ATTR_POSITION) as unknown as Float32Array;
            // const pos = new Vec3(posArr[rst.vertexIndex0], posArr[rst.vertexIndex1], posArr[rst.vertexIndex2]);
            // const norArr = mesh?.readAttribute(subMod.subMesh.subMeshIdx!, gfx.AttributeName.ATTR_NORMAL) as unknown as Float32Array;
            // const nor = new Vec3(norArr[rst.vertexIndex0], norArr[rst.vertexIndex1], norArr[rst.vertexIndex2]);

            // this.decalRoot?.addChild(DecalModel.create(this.decalTemplate, this.mr.model, pos, nor, new Vec3(1, 1, 1)));
            // console.log(pos);
            // console.log(nor);
        } else {
            console.log('model not touched');
            console.log('children length: ' + this.decalRoot?.children.length);
        }
    }
}
