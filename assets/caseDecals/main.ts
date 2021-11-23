
import { _decorator, Component, systemEvent, SystemEvent, EventTouch, Touch, geometry, Camera, MeshRenderer, gfx, Vec3, find, Node, TERRAIN_HEIGHT_BASE, random } from 'cc';
import { DecalModel } from './DecalModel';
const { ccclass, property } = _decorator;
 
@ccclass('Main')
export class Main extends Component {

    @property(Camera)
    mainCamera: Camera | null = null;

    @property(Node)
    targetNode: Node | null = null;

    @property(Node)
    decalTemplate: Node | null = null;

    @property(Camera)
    subCamera: Camera | null = null;

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

    onTouchStart1 (touch: Touch, event: EventTouch) {
        if (null == this.decalTemplate) { return; }

        let mr = this.targetNode?.getComponent(MeshRenderer);
        if (null == mr) { return; }

        console.log(this.subCamera?.camera.matProj);
        const decalNode = DecalModel.create(
            this.decalTemplate,
            mr,
            new Vec3(0, 0.5, 0),
            new Vec3(0, 1, 0),
            new Vec3(1, 1, 1.1));
        if (decalNode) {
            this.decalRoot?.addChild(decalNode);
        }
    }

    onTouchStart (touch: Touch, event: EventTouch) {
        if (null == this.targetNode) {
            // this.targetNode = find('Cube');
            this.targetNode = find('Sphere');
            // this.targetNode = find('cat_Idle/cat');
        }

        if (null == this.mainCamera) {
            console.log('main camera is not set');
            return;
        }
        if (null == this.decalTemplate) {
            console.log('decal template is not set');
            return;
        }
        if (null == this.targetNode) {
            console.log('targetNode is not set');
            return;
        }
        const mr = this.targetNode?.getComponent(MeshRenderer);

        const point = touch.getLocation();
        this.mainCamera.screenPointToRay(point.x, point.y, this._ray);

        if (this.modOpt.result) {
            this.modOpt.result.length = 0;
        }
        if (this.modOpt.subIndices) {
            this.modOpt.subIndices.length = 0;
        }
        let intersectCount = 0;

        const mo = mr?.model;
        if (!mo) {
            console.log('model is null');
            return;
        }
        const me = mr?.mesh;
        if (!me) {
            console.log('mesh is null');
            return;
        }
        intersectCount = geometry.intersect.rayModel(this._ray, mo, this.modOpt);
        if (intersectCount) {
            if (!this.modOpt.subIndices || !this.modOpt.result) {
                console.log(this.modOpt);
                return;
            }
            console.log('model touched');
            const r = this.modOpt.result!;
            const s = this.modOpt.subIndices;

            const position = new Vec3();
            const direction = new Vec3();
            if (me.renderingSubMeshes.length > 0) {
                const subIdx = s[0];
                // if (!me.renderingSubMeshes[subIdx]) {
                //     return;
                // }
                // const pos = me.renderingSubMeshes[subIdx].geometricInfo.positions;
                const pos = me.readAttribute(subIdx, gfx.AttributeName.ATTR_POSITION);
                if (!pos) {return; }

                const pa = new Vec3();
                let posIndex = r[0].vertexIndex0 * 3;
                pa.set(pos[posIndex], pos[posIndex + 1], pos[posIndex + 2]);
                Vec3.transformMat4(pa, pa, this.targetNode.worldMatrix);

                const pb = new Vec3();
                posIndex = r[0].vertexIndex1 * 3;
                pb.set(pos[posIndex], pos[posIndex + 1], pos[posIndex + 2]);
                Vec3.transformMat4(pb, pb, this.targetNode.worldMatrix);

                const pc = new Vec3();
                posIndex = r[0].vertexIndex2 * 3;
                pc.set(pos[posIndex], pos[posIndex + 1], pos[posIndex + 2]);
                Vec3.transformMat4(pc, pc, this.targetNode.worldMatrix);

                position.add(pa);
                position.add(pb);
                position.add(pc);
                position.divide3f(3, 3, 3);

                /*
                const normals = me.readAttribute(subIdx, gfx.AttributeName.ATTR_NORMAL);
                if (normals) {
                    const na = new Vec3();
                    let nIdx = r[0].vertexIndex0 * 3;
                    na.set(normals[nIdx], normals[nIdx + 1], normals[nIdx + 2]);

                    const nb = new Vec3();
                    nIdx = r[0].vertexIndex1 * 3;
                    nb.set(normals[nIdx], normals[nIdx + 1], normals[nIdx + 2]);

                    const nc = new Vec3();
                    nIdx = r[0].vertexIndex2 * 3;
                    nc.set(normals[nIdx], normals[nIdx + 1], normals[nIdx + 2]);

                    normal.add(na);
                    normal.add(nb);
                    normal.add(nc);
                    normal.divide3f(3, 3, 3);
                    Vec3.transformMat4(normal, normal, mo.node.worldMatrix);
                }
                */
            } else {
                this._ray.computeHit(position, r[0].distance);
            }
            Vec3.subtract(direction, this.mainCamera.node.worldPosition, position);
            direction.normalize();
            console.log('WPos:', position.clone());
            console.log('WDir:', direction.clone());

            // const posArr = mesh?.readAttribute(subMod.subMesh.subMeshIdx!, gfx.AttributeName.ATTR_POSITION) as unknown as Float32Array;
            // const pos = new Vec3(posArr[rst.vertexIndex0], posArr[rst.vertexIndex1], posArr[rst.vertexIndex2]);
            // const norArr = mesh?.readAttribute(subMod.subMesh.subMeshIdx!, gfx.AttributeName.ATTR_NORMAL) as unknown as Float32Array;
            // const nor = new Vec3(norArr[rst.vertexIndex0], norArr[rst.vertexIndex1], norArr[rst.vertexIndex2]);

            const decalNode = DecalModel.create(this.decalTemplate, mr,
                position, direction, new Vec3(0.1, 0.1, 2));
            if (decalNode) {
                this.targetNode.addChild(decalNode);
                // this.decalRoot?.addChild(decalNode);
            }
        } else {
            console.log('model not touched');
            console.log('children length: ' + this.decalRoot?.children.length);
        }
    }
}
