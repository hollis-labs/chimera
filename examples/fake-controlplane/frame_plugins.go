package main

import (
	"encoding/json"
	"fmt"
	"github.com/hollis-labs/chimera/plugins"
	"github.com/hollis-labs/libs/plugin-mcp/plugin-sdk/registry"
)

func demoFramePlugins(generation string) (*plugins.Delivery, error) {
	var revision uint64
	switch generation {
	case "g1":
		revision = 1
	case "g2":
		revision = 2
	case "g3":
		revision = 3
	default:
		return nil, fmt.Errorf("unreviewed fixture generation")
	}
	source := []byte(`import {createElement,useState} from "react";import {Button} from "@chimera/ui";
 globalThis.frameProof={realm:Math.random(),exact:"reviewed-frame-bytes",parent:(()=>{try{return !!parent.document.body}catch{return false}})(),storage:(()=>{try{return !!localStorage.getItem("secret")}catch{return false}})(),cookie:(()=>{try{return document.cookie.includes("secret")}catch{return false}})()};
 export function FrameView(props){const[count,setCount]=useState(0);const[outcome,setOutcome]=useState("none");const intent=(id,descriptor)=>()=>{globalThis.pluginFrame?.invoke(id,descriptor).then(result=>setOutcome(result.status))};return createElement("section",null,createElement("p",null,"Frame context: "+props.label),createElement(Button,{onClick:()=>setCount(count+1)},"Frame count "+count),createElement(Button,{onClick:intent("navigate",{type:"navigate",route:"detail",parameters:{}})},"Frame navigate"),createElement(Button,{onClick:intent("open",{type:"modal",region:"frames.modal",entry:{owner_id:"frame-tools",local_key:"modal"},props:{}})},"Frame modal"),createElement(Button,{onClick:intent("run",{type:"command",command:"frame-tools/run",arguments:{}})},"Frame simulate"),createElement("p",null,"Frame outcome: "+outcome))};FrameView.hook=useState;`)
	r := registry.NewResponse("isolated-frame-fixture", revision)
	for _, owner := range []string{"frame-ops", "frame-tools", "frame-stable"} {
		r.Plugins[owner] = registry.Plugin{OwnerGeneration: generation, BundleURL: "/plugins/" + owner + "/" + generation + "/bundle.js", BundleVersion: registry.BundleDigest(source), Runtime: []registry.Runtime{{Name: "react", Min: "19.3.0", Max: "19.3.0"}}}
	}
	r.Kinds["widget"] = registry.KindDescriptor{SchemaVersion: 1, MetadataSchema: json.RawMessage(`{}`), Representations: []registry.Representation{registry.Component}, Regions: []string{"frames.body", "frames.modal"}, RequiredCapabilities: []string{}}
	r.Kinds["command"] = registry.KindDescriptor{SchemaVersion: 1, MetadataSchema: json.RawMessage(`{}`), Representations: []registry.Representation{registry.Handler}, Regions: []string{"frames.commands"}, RequiredCapabilities: []string{}}
	for _, region := range []string{"frames.body", "frames.modal"} {
		r.Regions[region] = registry.RegionDescriptor{Kinds: []string{"widget"}, Representations: []registry.Representation{registry.Component}, ContextSchema: json.RawMessage(`{}`), Ordering: "manifest"}
	}
	r.Regions["frames.commands"] = registry.RegionDescriptor{Kinds: []string{"command"}, Representations: []registry.Representation{registry.Handler}, ContextSchema: json.RawMessage(`{}`), Ordering: "manifest"}
	for index, entry := range []struct{ owner, key, region, export string }{{"frame-ops", "first", "frames.body", "FrameView"}, {"frame-ops", "second", "frames.body", "FrameView"}, {"frame-stable", "stable", "frames.body", "FrameView"}, {"frame-ops", "missing", "frames.body", "Missing"}, {"frame-tools", "modal", "frames.modal", "FrameView"}} {
		metadata, _ := json.Marshal(map[string]any{"label": entry.key, "manifest_order": index})
		if err := r.Set(registry.Contribution{Status: registry.StatusAccepted, OwnerID: entry.owner, OwnerGeneration: generation, LocalKey: entry.key, Kind: "widget", SchemaVersion: 1, Representation: registry.Component, Metadata: metadata, Component: &registry.ComponentRef{Region: entry.region, Export: entry.export}}); err != nil {
			return nil, err
		}
	}
	if err := r.Set(registry.Contribution{Status: registry.StatusAccepted, OwnerID: "frame-tools", OwnerGeneration: generation, LocalKey: "run", Kind: "command", SchemaVersion: 1, Representation: registry.Handler, Metadata: json.RawMessage(`{"label":"fixture simulation"}`), Handler: &registry.HandlerRef{ID: "fixture-only"}}); err != nil {
		return nil, err
	}
	bundles := map[string]plugins.Bundle{}
	for owner := range r.Plugins {
		bundles[owner] = plugins.Bundle{JavaScript: source}
	}
	return plugins.NewDelivery(r, bundles, map[string]string{"react": "19.3.0"})
}
