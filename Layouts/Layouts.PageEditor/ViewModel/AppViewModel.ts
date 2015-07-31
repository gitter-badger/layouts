﻿
class AppViewModel extends layouts.DepObject {
    static typeName: string = "appViewModel";
    get typeName(): string {
        return AppViewModel.typeName;
    }


    _items: layouts.ObservableCollection<CodeViewModel> = new layouts.ObservableCollection<CodeViewModel>();

    get items(): layouts.ObservableCollection<CodeViewModel> {
        return this._items;
    }

    _selected: CodeViewModel;
    get selected(): CodeViewModel {
        return this._selected;
    }
    set selected(value: CodeViewModel) {
        if (this._selected != value) {
            var oldValue = this._selected;
            this._selected = value;
            this.onPropertyChanged("selected", value, oldValue);
        }
    }

    private _addCommand: layouts.Command;
    get addCommand(): layouts.Command {
        if (this._addCommand == null)
            this._addCommand = new layouts.Command((cmd, p) => this.onAddItem(), (cmd, p) => true);
        return this._addCommand;
    }

    onAddItem() {
        this._items.add(new CodeViewModel(this));
        this.selected = this._items.last();
        this.selected.title = "New Code " + this._items.count;
    }




} 