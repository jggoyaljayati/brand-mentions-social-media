document.addEventListener("DOMContentLoaded", () => {
	const selectedBrands = new Set();
	const selectedColors = new Set();
	const brandToColor = new Map();
	let curReviewBrand = "";

	const margin = { top: 20, right: 30, bottom: 50, left: 50 };
	const width = 800 - margin.left - margin.right;
	const height = 400 - margin.top - margin.bottom;
	const svg = d3
		.select("#mentionsChart")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", `translate(${margin.left}, ${margin.top})`);
	// let xScale, yScale;

	function getRandomColorExcludingSelected() {
		let newColor;

		do {
			// Generate a random hex color
			newColor = generateRandomColor();
		} while (selectedColors.has(newColor)); // Ensure it's not in the selected colors set
		selectedColors.add(newColor);
		return newColor;
	}

	// Helper function to generate a random hex color
	function generateRandomColor() {
		const randomHex = Math.floor(Math.random() * 16777215).toString(16); // Random hex value
		return `#${randomHex.padStart(6, "0")}`; // Ensure 6-character format
	}

	// Fetch data for a specific brand
	async function fetchDataForBrand(brand) {
		const response = await fetch(`/mentions_over_time?keyword=${brand}`);
		return response.json();
	}

	async function addBrand(brand) {
		const mentionsData = await fetchDataForBrand(brand);
		console.log(mentionsData);

		if (Array.isArray(mentionsData) && mentionsData.length === 0) {
			return false; // Return false if mentionsData is empty
		}

		mentionsData.forEach((d) => {
			const fullDate = new Date(d.date);
			d.date = new Date(
				fullDate.getFullYear(),
				fullDate.getMonth(),
				fullDate.getDate()
			);
		});
		brandToColor[brand] = getRandomColorExcludingSelected();

		// console.log("Parsed mentionsData:", mentionsData);

		const padding = 1; // Number of days for padding

		const xScale = d3
			.scaleTime()
			.domain([
				new Date(
					d3.min(mentionsData, (d) => d.date).getTime() -
						padding * 24 * 60 * 60 * 1000
				),
				new Date(
					d3.max(mentionsData, (d) => d.date).getTime() +
						padding * 24 * 60 * 60 * 1000
				),
			])
			.range([0, width]);

		const yScale = d3
			.scaleLinear()
			.domain([0, d3.max(mentionsData, (d) => d.count) + 5]) // Use maximum count for domain
			.range([height, 0]);

		const yAxis = d3.axisLeft().scale(yScale);

		svg.selectAll(".axis").transition().duration(500).call(yAxis);

		const line = d3
			.line()
			.x((d) => xScale(d.date)) // Map converted date to x position
			.y((d) => yScale(d.count)); // Map count to y position

		svg
			.append("path")
			.datum(mentionsData)
			.attr("d", line)
			.attr("fill", "none") // Ensure the line is not filled
			.attr("stroke", brandToColor[brand])
			.attr("stroke-width", 3)
			.attr("class", `line-${brand}`);

		// Add points to the line
		svg
			.selectAll(`.dot-${brand}`)
			.data(mentionsData)
			.enter()
			.append("circle")
			.attr("cx", (d) => xScale(d.date))
			.attr("cy", (d) => yScale(d.count))
			.attr("r", 4)
			.attr("fill", brandToColor[brand])
			.attr("class", `dot-${brand}`);

		// Tooltip
		const tooltip = d3
			.select("body")
			.append("div")
			.style("opacity", 0)
			.style("position", "absolute")
			.style("background", brandToColor[brand])
			.style("border", "1px solid #ccc")
			.style("padding", "5px")
			.style("border-radius", "4px")
			.style("pointer-events", "none")
			.style("box-shadow", "0 0 5px rgba(0, 0, 0, 0.3)")
			.attr("class", `tooltip-${brand}`);

		// Add tooltip interaction
		svg
			.selectAll(`.dot-${brand}`)
			.on("mouseover", (event, d) => {
				tooltip.transition().duration(200).style("opacity", 0.7);
				tooltip
					.html(
						`${brand}<br>Date: ${d3.timeFormat("%m-%d")(
							new Date(d.date)
						)}<br>Mentions: ${d.count}`
					)
					.style("left", event.pageX + 10 + "px")
					.style("top", event.pageY - 20 + "px");
			})
			.on("mousemove", (event) => {
				tooltip
					.style("left", event.pageX + 10 + "px")
					.style("top", event.pageY - 20 + "px");
			})
			.on("mouseout", () => {
				tooltip.transition().duration(500).style("opacity", 0);
			});
		svg.selectAll(`.line-${brand}`).on("click", function (event, d) {
			const brand = d3.select(this).attr("class").replace("line-", ""); // Extract brand name from class
			fetchReviews(brand); // Fetch and display reviews for the clicked brand
			curReviewBrand = brand;
			toggleReviewsContainer(true);
		});
		return true;
	}
	// Render the chart
	async function renderChart(brand) {
		console.log(selectedBrands);
		if (selectedBrands.size > 0) {
			console.log("line 146");
			addBrand(brand).then((result) => {
				return result;
			}); // Proceed if selectedBrands is non-empty
		}

		const mentionsData = await fetchDataForBrand(brand);
		// console.log(mentionsData);

		// Check if mentionsData is an empty array
		if (Array.isArray(mentionsData) && mentionsData.length === 0) {
			return false; // Return false if mentionsData is empty
		}

		selectedBrands.add(brand);
		brandToColor[brand] = getRandomColorExcludingSelected();

		// Convert timestamps into Date objects
		mentionsData.forEach((d) => {
			const fullDate = new Date(d.date);
			d.date = new Date(
				fullDate.getFullYear(),
				fullDate.getMonth(),
				fullDate.getDate()
			);
		});

		// Debug parsed data
		// console.log("Parsed mentionsData:", mentionsData);

		// Create SVG canvas
		// Create scales
		const padding = 1; // Number of days for padding

		const xScale = d3
			.scaleTime()
			.domain([
				new Date(
					d3.min(mentionsData, (d) => d.date).getTime() -
						padding * 24 * 60 * 60 * 1000
				),
				new Date(
					d3.max(mentionsData, (d) => d.date).getTime() +
						padding * 24 * 60 * 60 * 1000
				),
			])
			.range([0, width]);

		const yScale = d3
			.scaleLinear()
			.domain([0, d3.max(mentionsData, (d) => d.count) + 5]) // Use maximum count for domain
			.range([height, 0]);

		// Create axes
		const xAxis = d3
			.axisBottom(xScale)
			.ticks(mentionsData.length) // Match number of ticks to data points
			.tickFormat(d3.timeFormat("%b %d")); // Format as 'Nov 21, 2024'
		// Format as MM-DD

		const yAxis = d3.axisLeft(yScale).ticks(5);

		svg
			.append("text")
			.attr("text-anchor", "middle")
			.attr("x", width / 2) // Position at the middle of the x-axis
			.attr("y", height + margin.bottom - 10) // Position below the x-axis
			.text("Time") // Label text
			.style("font-size", "14px")
			.style("fill", "black");

		svg
			.append("text")
			.attr("text-anchor", "middle")
			.attr("x", -height / 2) // Rotate position to the middle of the y-axis
			.attr("y", -margin.left + 15) // Position to the left of the y-axis
			.attr("transform", "rotate(-90)") // Rotate the text for the y-axis
			.text("Mentions") // Label text
			.style("font-size", "14px")
			.style("fill", "black");

		// Append axes
		svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);

		svg.append("g").classed("axis", true).call(yAxis);

		// Line generator
		const line = d3
			.line()
			.x((d) => xScale(d.date)) // Map converted date to x position
			.y((d) => yScale(d.count)); // Map count to y position

		// Append the line
		svg
			.append("path")
			.datum(mentionsData)
			.attr("d", line)
			.attr("fill", "none") // Ensure the line is not filled
			.attr("stroke", brandToColor[brand])
			.attr("stroke-width", 3)
			.attr("class", `line-${brand}`);

		// Add points to the line
		svg
			.selectAll(`.dot-${brand}`)
			.data(mentionsData)
			.enter()
			.append("circle")
			.attr("cx", (d) => xScale(d.date))
			.attr("cy", (d) => yScale(d.count))
			.attr("r", 4)
			.attr("fill", brandToColor[brand])
			.attr("class", `dot-${brand}`);

		// Tooltip
		const tooltip = d3
			.select("body")
			.append("div")
			.style("opacity", 0)
			.style("position", "absolute")
			.style("background", brandToColor[brand])
			.style("border", "1px solid #ccc")
			.style("padding", "5px")
			.style("border-radius", "4px")
			.style("pointer-events", "none")
			.style("box-shadow", "0 0 5px rgba(0, 0, 0, 0.3)")
			.attr("class", `tooltip-${brand}`);

		// Add tooltip interaction
		svg
			.selectAll(`.dot-${brand}`)
			.on("mouseover", (event, d) => {
				tooltip.transition().duration(200).style("opacity", 0.7);
				tooltip
					.html(
						`${brand}<br>Date: ${d3.timeFormat("%m-%d")(
							new Date(d.date)
						)}<br>Mentions: ${d.count}`
					)
					.style("left", event.pageX + 10 + "px")
					.style("top", event.pageY - 20 + "px");
			})
			.on("mousemove", (event) => {
				tooltip
					.style("left", event.pageX + 10 + "px")
					.style("top", event.pageY - 20 + "px");
			})
			.on("mouseout", () => {
				tooltip.transition().duration(500).style("opacity", 0);
			});

		svg.selectAll(`.line-${brand}`).on("click", function (event, d) {
			const brand = d3.select(this).attr("class").replace("line-", ""); // Extract brand name from class
			fetchReviews(brand); // Fetch and display reviews for the clicked brand
			curReviewBrand = brand;
			toggleReviewsContainer(true);
		});
		return true;
	}

	async function fetchReviews(brand) {
		try {
			const response = await fetch(
				`/get_reviews?brand=${encodeURIComponent(brand)}`
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch reviews for ${brand}: ${response.status}`
				);
			}

			const reviews = await response.json();
			displayReviews(brand, reviews);
		} catch (error) {
			console.error(error);
			displayReviews(brand, ["Unable to fetch reviews at this time."]);
		}
	}

	function displayReviews(brand, reviews) {
		const reviewsContainer = document.getElementById("reviews");
		reviewsContainer.innerHTML = `<h3>-----${brand}-----</h3>`; // Add heading

		if (reviews.length === 0) {
			reviewsContainer.innerHTML += "<p>No reviews available.</p>";
		} else {
			reviews.forEach((review) => {
				const p = document.createElement("p");

				// Create the date/time element (in italics)
				const dateSpan = document.createElement("span");
				dateSpan.style.fontStyle = "italic";
				dateSpan.textContent = `${review.date} ${review.time || ""}`; // Add time if available

				// Create a spacer between the date and the review text
				const spacer = document.createTextNode(" - "); // Adds space and a dash

				// Create the review text element
				const textSpan = document.createElement("span");
				textSpan.textContent = review.text;

				// Append all elements to the paragraph
				p.appendChild(dateSpan);
				p.appendChild(spacer);
				p.appendChild(textSpan);

				reviewsContainer.appendChild(p);
			});
		}
	}
	function toggleReviewsContainer(show) {
		const reviewsContainer = document.querySelector(".reviews-container");
		if (show) {
			reviewsContainer.classList.add("visible"); // Show the container
		} else {
			reviewsContainer.classList.remove("visible"); // Hide the container
		}
	}
	function removeBrand(brand) {
		if (brand == curReviewBrand) {
			curReviewBrand = "";
			toggleReviewsContainer(false);
		}
		console.log(selectedBrands);
		selectedBrands.delete(brand);
		selectedColors.delete(brandToColor[brand]);
		brandToColor.delete(brand);
		if (selectedBrands.size == 0) {
			svg.selectAll("*").remove(); // Clear the chart
			return;
		}
		svg.selectAll(`.dot-${brand}`).remove();
		svg.selectAll(`.tooltip-${brand}`).remove();
		svg.selectAll(`.line-${brand}`).remove();
	}

	// Handle brand input
	document
		.getElementById("brandInput")
		.addEventListener("keypress", (event) => {
			if (event.key === "Enter") {
				const brand = event.target.value.trim();
				if (brand && !selectedBrands.has(brand)) {
					renderChart(brand).then((result) => {
						if (result) {
							addTag(brand);
						}
					});
				}
				event.target.value = ""; // Clear input
			}
		});

	// Add a tag
	function addTag(brand) {
		const tagContainer = document.getElementById("tags");
		const tag = document.createElement("span");
		tag.className = "tag";
		tag.id = `tag-${brand}`; // Unique ID for the tag
		tag.innerHTML = `${brand} <span class="remove" data-brand="${brand}">x</span>`; // Use data attribute instead of inline onclick
		tagContainer.appendChild(tag);

		// Add event listener for the remove button
		tag.querySelector(".remove").addEventListener("click", (event) => {
			event.preventDefault(); // Prevent default behavior
			event.stopPropagation(); // Stop event from bubbling up
			removeTag(brand); // Call removeTag with the brand name
		});
	}

	// Remove a tag
	window.removeTag = function (brand) {
		// console.log("Current selectedBrands:", selectedBrands); // Debugging statement
		removeBrand(brand); // Remove the brand from selectedBrands (or perform other logic)

		const tag = document.getElementById(`tag-${brand}`); // Select the tag by its unique ID
		if (tag) {
			tag.remove(); // Remove the specific tag
		}
	};
});
