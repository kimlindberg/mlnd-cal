<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<AvatarPrimitive.ImageProps> = $props();
</script>

<AvatarPrimitive.Image
	bind:ref
	data-slot="avatar-image"
	class={cn("aspect-square h-full w-full", className)}
	{...restProps}
/>
