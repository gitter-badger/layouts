﻿/// <reference path="DepProperty.ts" />
/// <reference path="DepObject.ts" />

module layouts {
    export class Size {
        constructor(public width: number = 0, public height: number = 0) {
        }

        toRect(): Rect {
            return new Rect(0, 0, this.width, this.height);
        }
    }
    export class Rect { constructor(public x: number = 0, public y: number = 0, public width: number = 0, public height: number = 0) { } get size(): Size { return new Size(this.width, this.height); } }
    export class Vector { constructor(public x: number = 0, public y: number = 0) { } }

    export enum FrameworkPropertyMetadataOptions {
        /// No flags
        None = 0x000,

        /// This property affects measurement
        AffectsMeasure = 0x001,

        /// This property affects arragement
        AffectsArrange = 0x002,

        /// This property affects parent's measurement
        AffectsParentMeasure = 0x004,

        /// This property affects parent's arrangement
        AffectsParentArrange = 0x008,

        /// This property affects rendering
        AffectsRender = 0x010,

        /// This property inherits to children
        Inherits = 0x020,

        /// NOT SUPPORTED: 
        /// This property causes inheritance and resource lookup to override values 
        /// of InheritanceBehavior that may be set on any FE in the path of lookup
        OverridesInheritanceBehavior = 0x040,

        /// This property does not support data binding
        NotDataBindable = 0x080,

        /// Data bindings on this property default to two-way
        BindsTwoWayByDefault = 0x100,
    }

    export class ExtendedProperty {
        constructor(public name: string, public value: string) {
        }
    }

    export class UIElement extends DepObject {

        static typeName: string = "layouts.UIElement";
        get typeName(): string {
            return UIElement.typeName;
        }


        desideredSize: Size;
        renderSize: Size;

        ///Measure Pass
        private previousAvailableSize: Size;
        measure(availableSize: Size): void {

            if (!this.isVisible) {
                this.desideredSize = new Size();
                return;
            }

            var isCloseToPreviousMeasure = this.previousAvailableSize == null ? false : availableSize.width.isCloseTo(this.previousAvailableSize.width) &&
                availableSize.height.isCloseTo(this.previousAvailableSize.height);

            if (!this.measureDirty && isCloseToPreviousMeasure)
                return;

            this.previousAvailableSize = availableSize;
            this.desideredSize = this.measureCore(availableSize);
            this.measureDirty = false;
        }
        protected measureCore(availableSize: Size): Size {
            return new Size();
        }

        ///Arrange Pass
        private finalRect: Rect;
        private previousFinalRect: Rect;
        arrange(finalRect: Rect): void {
            if (this.measureDirty)
                this.measure(finalRect.size);

            if (!this.isVisible)
                return;

            var isCloseToPreviousArrange = this.previousFinalRect == null ? false :
                finalRect.x.isCloseTo(this.previousFinalRect.x) &&
                finalRect.y.isCloseTo(this.previousFinalRect.y) &&
                finalRect.width.isCloseTo(this.previousFinalRect.width) &&
                finalRect.height.isCloseTo(this.previousFinalRect.height);

            if (!this.arrangeDirty && isCloseToPreviousArrange)
                return;

            this.layoutInvalid = true;
            this.previousFinalRect = finalRect;
            this.arrangeCore(finalRect);

            this.finalRect = finalRect;

            this.arrangeDirty = false;
        }
        protected arrangeCore(finalRect: Rect): void {
            this.renderSize = finalRect.size;
        }

        ///Render Pass
        layout() {
            if (this.layoutInvalid) {
                this.layoutOverride();
                if (this._visual != null &&
                    this._visual.hidden &&
                    this.isVisible)
                    //if visual is hidden here means that I just added it hidden to DOM
                    //so restore it visible (see attachVisual() below)
                    this._visual.style.visibility = "visible";

                this.layoutInvalid = false;
            }
        }
        protected layoutOverride() {

        }

        ///Attach page visual tree (attach to null to remove it from DOM)
        protected _visual: HTMLElement;
        attachVisual(elementContainer: HTMLElement): void {

            //1. if a visual is not yet create and we have a container
            //try create it now
            if (this._visual == null &&
                elementContainer != null) 
                this.attachVisualOverride(elementContainer);

            //2. if visual is still null give up
            if (this._visual == null)
                return;

            //3. if visual is not under container...
            if (elementContainer != this._visual.parentElement) {
                
                //4. remove visual from old container 
                if (this._visual.parentElement != null) {
                    this._visual.parentElement.removeChild(this._visual);
                    this.visualDisconnected(this._visual.parentElement);
                }

                //5. if container is valid (not null) add visual under it
                //note container could be null in this case visual is just detached from DOM
                if (elementContainer != null) {
                    //before add the element to the DOM tree hide to avoid flickering
                    //visual will be restore to visible after it's correctly positioned
                    //see above layout()
                    //NOTE: we use CSS visibility instead of hidden property because with former
                    //element size is still valid 
                    //http://stackoverflow.com/questions/2345784/jquery-get-height-of-hidden-element-in-jquery
                    this._visual.style.visibility = "hidden";
                    elementContainer.appendChild(this._visual);
                    this.visualConnected(elementContainer);
                }
            }
        }

        protected attachVisualOverride(elementContainer: HTMLElement): void {

        }

        protected visualConnected(elementContainer: HTMLElement): void {

        }

        protected visualDisconnected(elementContainer: HTMLElement): void {

        }



        protected onDependencyPropertyChanged(property: DepProperty, value: any, oldValue: any) {
            var options = <FrameworkPropertyMetadataOptions>property.options;
            if ((options & FrameworkPropertyMetadataOptions.AffectsMeasure) != 0)
                this.invalidateMeasure();
            else if ((options & FrameworkPropertyMetadataOptions.AffectsArrange) != 0)
                this.invalidateArrange();
            else if ((options & FrameworkPropertyMetadataOptions.AffectsParentMeasure) != 0 && this._parent != null)
                this._parent.invalidateMeasure();
            else if ((options & FrameworkPropertyMetadataOptions.AffectsParentArrange) != 0 && this._parent != null)
                this._parent.invalidateArrange();
            else if ((options & FrameworkPropertyMetadataOptions.AffectsRender) != 0)
                this.invalidateLayout();
            else if ((options & FrameworkPropertyMetadataOptions.Inherits) != 0 && this._logicalChildren != null)
                //foreach child notify property changing event, unfortunately
                //there is not a more efficient way than walk logical tree down to leaves
                this._logicalChildren.forEach((child) => child.onDependencyPropertyChanged(property, value, oldValue));

            super.onDependencyPropertyChanged(property, value, oldValue);
        }

        getValue(property: DepProperty): any {
            if (this.localPropertyValueMap[property.name] == null) {
                var options = <FrameworkPropertyMetadataOptions>property.options;
                if (options != null &&
                    this._parent != null &&
                    (options & FrameworkPropertyMetadataOptions.Inherits) != 0) {
                    //search property on parent
                    return this._parent.getValue(property);
                }

                //get default
                return property.getDefaultValue(this);
            }

            //there is a local value
            return this.localPropertyValueMap[property.name];
        }

        private measureDirty: boolean = true;
        invalidateMeasure(): void {
            if (!this.measureDirty) {
                this.measureDirty = true;
                this.arrangeDirty = true;
                this.layoutInvalid = true;
                if (this._parent != null)
                    this._parent.invalidateMeasure();
            }
        }

        private arrangeDirty: boolean = true;
        invalidateArrange(): void {
            if (!this.arrangeDirty) {
                this.arrangeDirty = true;
                this.layoutInvalid = true;
                if (this._parent != null)
                    this._parent.invalidateArrange();
            }
        }

        private layoutInvalid: boolean = true;
        invalidateLayout(): void {
            if (!this.layoutInvalid) {
                this.layoutInvalid = true;
                if (this._parent != null)
                    this._parent.invalidateLayout();
            }
        }

        private _logicalChildren: Array<UIElement>;
        findElementByName(name: string): UIElement {
            if (name == this.id)
                return this;

            if (this._logicalChildren != null) {
                for (var i = 0; i < this._logicalChildren.length; i++) {
                    let child = this._logicalChildren[i];
                    let foundElement = child.findElementByName(name);
                    if (foundElement != null)
                        return foundElement;
                }
            }

            return null;
        }

        private _parent: UIElement;
        get parent(): UIElement {
            return this._parent;
        }

        set parent(newParent: UIElement) {
            if (this._parent != newParent) {
                var oldParent = this._parent;
                if (oldParent != null) {
                    var indexOfElement = oldParent._logicalChildren.indexOf(this);
                    oldParent._logicalChildren.splice(indexOfElement, 1);
                }

                this._parent = newParent;

                if (newParent != null) {
                    if (newParent._logicalChildren == null)
                        newParent._logicalChildren = new Array<UIElement>();
                    newParent._logicalChildren.push(this);

                }

                this.notifyInheritsPropertiesChange();

                this.onParentChanged(oldParent, newParent);
            }
        }

        private notifyInheritsPropertiesChange() {
            for (let propertyName in this.localPropertyValueMap) {
                var property = this.localPropertyValueMap[propertyName];
                var options = property == null ? null : <FrameworkPropertyMetadataOptions>property.options;
                if (options != null &&
                    (options & FrameworkPropertyMetadataOptions.Inherits) != 0) {
                    //if my parent changed I need to notify any of children to update
                    //any binding linked to my property that has FrameworkPropertyMetadataOptions.Inherits
                    //option (most of cases dataContext)
                    //there is not a real value change, only a notification to allow binding update
                    //so value==oldValue
                    var value = this.getValue(property);
                    this._logicalChildren.forEach((child) => child.onDependencyPropertyChanged(property, value, value));
                }
            }

            if (this._parent != null)
                this._parent.notifyInheritsPropertiesChange();
        }

        protected onParentChanged(oldParent: DepObject, newParent: DepObject) {

        }

        //extended properties are key-value items that loader was unable to assign to element
        //because they didn't not correspond to any property (dependency or native) exposed by element
        protected _extendedProperties: ExtendedProperty[] = [];
        addExtentedProperty(name: string, value: string) {
            this._extendedProperties.push(new ExtendedProperty(name, value));
        }
        

        static isVisibleProperty = DepObject.registerProperty(UIElement.typeName, "IsVisible", true, FrameworkPropertyMetadataOptions.AffectsParentMeasure | FrameworkPropertyMetadataOptions.AffectsRender);
        get isVisible(): boolean {
            return <boolean>this.getValue(UIElement.isVisibleProperty);
        }
        set isVisible(value: boolean) {
            this.setValue(UIElement.isVisibleProperty, value);
        }
        
        static styleProperty = DepObject.registerProperty(UIElement.typeName, "cssStyle", Consts.stringEmpty, FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsRender);
        get cssStyle(): string {
            return <string>this.getValue(UIElement.styleProperty);
        }
        set cssStyle(value: string) {
            this.setValue(UIElement.styleProperty, value);
        }

        static classProperty = DepObject.registerProperty(UIElement.typeName, "class", null, FrameworkPropertyMetadataOptions.AffectsMeasure | FrameworkPropertyMetadataOptions.AffectsRender);
        get cssClass(): string {
            return <string>this.getValue(UIElement.classProperty);
        }
        set cssClass(value: string) {
            this.setValue(UIElement.classProperty, value);
        }

        //name property
        static idProperty = DepObject.registerProperty(UIElement.typeName, "id", Consts.stringEmpty, FrameworkPropertyMetadataOptions.AffectsRender);
        get id(): string {
            return <string>this.getValue(UIElement.idProperty);
        }
        set id(value: string) {
            this.setValue(UIElement.idProperty, value);
        }
    }
} 